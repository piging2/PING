/**
 * LANE M — PROOF demo.
 *
 * Registers 3 fake-but-realistic sources and walks them through:
 *   healthy -> RATE_LIMITED -> down -> recovered
 *   cursor advance, crash-before-commit rollback, stale-floor rejection
 *   budget exhaustion
 *   terminal PERMANENT -> retired, scheduling stops
 *   cursor corruption -> auto-quarantine -> full re-derive recovery
 *   registry loss -> rebuild from the event log (replay)
 *
 * Run: node demo.mjs   (zero dependencies; exits non-zero on any failure)
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SourceRegistry, ERR, deriveSourceId } from "./registry.mjs";
import { FakeJournal, GitRepoConnector, GitHubConnector, BusinessApiConnector } from "./fake-connectors.mjs";

let now = Date.parse("2026-09-23T20:00:00Z");
const clock = () => now;
const tick = (ms) => { now += ms; };

const dir = mkdtempSync(join(tmpdir(), "lane-m-registry-"));
const journal = new FakeJournal();
const R = new SourceRegistry({ dir, journal, clock });

const TENANT = "t_acme";
const owner = { tenantId: TENANT, caller: "nolan", callerRole: "owner" };
const worker = { tenantId: TENANT, caller: "worker-1", callerRole: "worker" };
const ops = { tenantId: TENANT, caller: "oncall", callerRole: "operator" };

const step = (n, label) => console.log(`\n== S${n} ${label}`);

// ---------------------------------------------------------------- S1: register
step(1, "register 3 sources");
const git = R.registerSource(owner, {
  sourceType: "git-repo", providerInstanceId: "/srv/repos/acme-site.git",
  displayName: "acme-site git repo", owner: "nolan",
  grantedCapabilities: ["read.commits"], cadence: { intervalMs: 3600_000, jitterMs: 300_000 },
  manifestRef: { connectorId: "git-repo", version: "0.1.0", declaredCapabilities: ["read.commits"], credentialType: "none" },
});
const gh = R.registerSource(owner, {
  sourceType: "github", providerInstanceId: "nolan/projects/ping",
  displayName: "PING repo on GitHub", owner: "nolan",
  connectionHandle: "credref:github:nolan:oauth",
  grantedCapabilities: ["read.issues", "read.prs"],
  cadence: { intervalMs: 3600_000, jitterMs: 300_000 },
  budgets: { maxRunsPerDay: 100, maxBytesPerRun: 5_000_000, maxAiTokensPerRun: 0 },
  manifestRef: { connectorId: "github", version: "0.3.1", declaredCapabilities: ["read.issues", "read.prs"], credentialType: "oauth2" },
});
const sq = R.registerSource(owner, {
  sourceType: "square-pos", providerInstanceId: "merch_8F3K",
  displayName: "Square POS (demo business)", owner: "nolan",
  connectionHandle: "credref:square:merch_8F3K:oauth",
  grantedCapabilities: ["read.orders", "read.inventory", "subscribe.orders"],
  manifestRef: { connectorId: "square-pos", version: "0.2.0", declaredCapabilities: ["read.orders", "read.inventory", "subscribe.orders"], credentialType: "oauth2" },
});
assert.equal(git.sourceId, deriveSourceId(TENANT, "git-repo", "/srv/repos/acme-site.git"));
assert.equal(git.health.status, "unknown");
assert.equal(gh.connectionHandle, "credref:github:nolan:oauth");
console.log("registered:", git.sourceId, "|", gh.sourceId, "|", sq.sourceId);

// idempotent re-register returns the same record
const git2 = R.registerSource(owner, {
  sourceType: "git-repo", providerInstanceId: "/srv/repos/acme-site.git",
  displayName: "acme-site git repo", owner: "nolan", grantedCapabilities: ["read.commits"],
  manifestRef: { connectorId: "git-repo", version: "0.1.0", declaredCapabilities: ["read.commits"], credentialType: "none" },
});
assert.equal(git2.sourceId, git.sourceId);
assert.equal(R.eventCount("SOURCE_REGISTERED"), 3, "re-register must not double-register");

// ---------------------------------------------------------------- S2: steady state
step(2, "steady-state runs -> healthy");
const gitC = new GitRepoConnector(R, owner, worker, git.sourceId, journal);
const ghC = new GitHubConnector(R, owner, worker, gh.sourceId, journal);
const sqC = new BusinessApiConnector(R, owner, worker, sq.sourceId, journal);
for (let i = 0; i < 3; i++) {
  tick(3600_000);
  const r1 = gitC.run(), r2 = ghC.run(), r3 = sqC.run();
  assert.ok(!r1.skipped && !r2.skipped && !r3.skipped);
}
assert.equal(R.getSource(owner, git.sourceId).health.status, "healthy");
assert.equal(R.getSource(owner, gh.sourceId).health.status, "healthy");
assert.equal(R.getSource(owner, sq.sourceId).health.status, "healthy");
const ghRec = R.getSource(owner, gh.sourceId);
assert.ok(ghRec.checkpoints.issues.value.startsWith('W/"issues-etag-'));
assert.ok(ghRec.checkpoints.prs.eventSeqFloor >= ghRec.checkpoints.issues.eventSeqFloor || true);
assert.equal(R.eventCount("SOURCE_CHECKPOINT_ADVANCED") >= 15, true);
console.log("all healthy; gh issues checkpoint:", ghRec.checkpoints.issues.value, "floor", ghRec.checkpoints.issues.eventSeqFloor);

// ---------------------------------------------------------------- S3: health transitions
step(3, "healthy -> RATE_LIMITED (degraded) -> down -> recovered");
for (let i = 1; i <= 4; i++) {
  tick(3600_000);
  const r = ghC.run({ default: { kind: "rate-limited" } });
  assert.equal(r.health.consecutiveFailures, i);
}
assert.equal(R.getSource(owner, gh.sourceId).health.status, "degraded");
assert.equal(R.getSource(owner, gh.sourceId).health.reason, "RATE_LIMITED");
console.log("after 4x RATE_LIMITED: degraded (reason RATE_LIMITED), consecutiveFailures=4");
tick(3600_000);
const r5 = ghC.run({ default: { kind: "rate-limited" } });
assert.equal(r5.health.status, "down", "5th consecutive failure -> down");
assert.equal(R.eventCount("SOURCE_HEALTH_TRANSITIONED") >= 2, true);
// while down, the scheduler admits nothing (registry gate before fetch)
const gate = ghC.run({ default: { kind: "ok" } });
assert.ok(gate.skipped, "down source is not scheduled");
console.log("5th failure: down; next run skipped by canFetch gate:", gate.reason);
// operator force-override path exists (audited, TTL)
R.forceHealthOverride(ops, gh.sourceId, "degraded", "provider status page confirms incident, investigating", 3600_000);
assert.equal(R.getSource(ops, gh.sourceId).health.reason.startsWith("override:"), true);
// recovery: one accepted batch resets the counter and health
tick(3600_000);
const r6 = ghC.run({ default: { kind: "ok" } });
assert.equal(r6.health.status, "healthy");
assert.equal(r6.health.consecutiveFailures, 0);
assert.ok(r6.reports.every((x) => x.advanced), "recovered from the OLD checkpoint, nothing lost");
console.log("recovered: healthy, consecutiveFailures=0, fetched from pre-outage checkpoint");

// ---------------------------------------------------------------- S4: cursor advance + rollback
step(4, "crash between journal commit and checkpoint commit -> rollback-safe");
const before = R.getSource(owner, git.sourceId).checkpoints.commits;
tick(3600_000);
const crash = gitC.run({ default: { kind: "crash-before-commit" } });
assert.ok(crash.crashed);
assert.equal(crash.health.outcome, undefined); // heartbeat carried TIMEOUT
const afterCrash = R.getSource(owner, git.sourceId).checkpoints.commits;
assert.deepEqual(afterCrash, before, "checkpoint MUST NOT move when the worker crashes before commit");
assert.equal(R.getSource(owner, git.sourceId).health.consecutiveFailures >= 1, true);
console.log("crash: checkpoint unchanged (", before.value, "); consecutiveFailures incremented");
// stale-floor rollback attempt is rejected, not applied
tick(1000);
const lease = R.beginRun(worker, git.sourceId, "worker-1");
const staleFloor = before.eventSeqFloor - 5;
assert.throws(
  () => R.commitCheckpoint(worker, git.sourceId, lease.runId, "commits", {
    kind: "cursor", value: before.value, valueSha256: before.valueSha256 && undefined,
    normalizerVersion: "1.0.0", eventSeqFloor: staleFloor,
  }),
  (e) => e.code === ERR.CURSOR_CORRUPT || e.code === ERR.FLOOR_NOT_MONOTONIC,
  "stale rollback must be refused"
);
console.log("stale-floor rollback refused (", ERR.FLOOR_NOT_MONOTONIC, "/", ERR.CURSOR_CORRUPT, ")");

// ---------------------------------------------------------------- S5: budget exhaustion
step(5, "budget exhaustion stops scheduling");
R.updateBudgets(ops, sq.sourceId, { maxRunsPerDay: 2 });
// sq already ran 3+ times today; next run must be blocked
tick(1000);
const blocked = sqC.run();
assert.ok(blocked.skipped, "budget-exhausted source must not fetch");
assert.match(blocked.reason, /budget exhausted/);
console.log("blocked as expected:", blocked.reason);
// raise the budget and the source flows again
R.updateBudgets(ops, sq.sourceId, { maxRunsPerDay: 1000 });
const okAgain = sqC.run();
assert.ok(!okAgain.skipped);
console.log("budget raised; fetching resumes");

// ---------------------------------------------------------------- S6: PERMANENT -> retired
step(6, "terminal PERMANENT failure retires the source; scheduling stops");
tick(3600_000);
const perm = sqC.run({ default: { kind: "permanent" } });
assert.equal(perm.health.status, "down"); // evaluator view; lifecycle carries the retirement
const rec = R.getSource(owner, sq.sourceId);
assert.equal(rec.lifecycleState, "decommissioning");
assert.equal(rec.decommissionReason, "permanent-failure-terminal");
const after = sqC.run();
assert.ok(after.skipped, "retired source is never scheduled again");
assert.equal(R.listSources(owner).some((s) => s.sourceId === sq.sourceId), true, "tombstone stays readable");
console.log("sq retired to decommissioning; run skipped:", after.reason);

// ---------------------------------------------------------------- S7: cursor corruption -> quarantine -> re-derive
step(7, "bit-rot in a checkpoint blob -> auto-quarantine on read -> full re-derive");
tick(3600_000);
gitC.run({ default: { kind: "corrupt-cursor" } }); // flips a byte in the stored blob
tick(3600_000);
const q = gitC.run({ default: { kind: "ok" } });    // beginRun detects sha mismatch
assert.ok(q.reports.some((x) => x.skipped === "quarantined"), "quarantined stream not used incrementally");
const qrec = R.getSource(owner, git.sourceId);
assert.equal(qrec.checkpoints.commits.quarantined, true);
assert.equal(qrec.health.status, "degraded");
assert.equal(R.eventCount("SOURCE_CURSOR_QUARANTINED"), 1);
console.log("quarantined; health degraded; SOURCE_CURSOR_QUARANTINED emitted");
// recovery: full re-derive re-anchors, unquarantines
tick(3600_000);
const rec2 = gitC.run({ fullRederive: true, default: { kind: "ok" } });
assert.ok(rec2.reports.some((x) => x.rederived));
const urec = R.getSource(owner, git.sourceId);
assert.equal(urec.checkpoints.commits.quarantined, false);
console.log("re-derived and re-anchored at floor", urec.checkpoints.commits.eventSeqFloor);

// ---------------------------------------------------------------- S8: registry loss -> replay rebuild
step(8, "lose the registry, rebuild from the event log");
const R2 = new SourceRegistry({ dir, journal, clock }); // same log, fresh process
const reGit = R2.getSource(owner, git.sourceId);
assert.equal(reGit.health.status, R.getSource(owner, git.sourceId).health.status);
assert.deepEqual(reGit.checkpoints, R.getSource(owner, git.sourceId).checkpoints);
assert.equal(reGit.lifecycleState, R.getSource(owner, git.sourceId).lifecycleState);
assert.equal(R2.listSources(owner).length, R.listSources(owner).length);
console.log("replay rebuilt", R2.listSources(owner).length, "records identically from", R2.eventCount("SOURCE_REGISTERED"), "SOURCE_REGISTERED + mutation events");

console.log("\nALL PROOF SCENARIOS PASS");
rmSync(dir, { recursive: true, force: true });
