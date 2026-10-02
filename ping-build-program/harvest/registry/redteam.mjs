/**
 * LANE M — RED TEAM.
 *
 * Adversary cases against the registry spike. Each case must FAIL LOUDLY
 * (throw the typed error) or HOLD the invariant. A case that silently
 * succeeds is a red-team FINDING.
 *
 * Run: node redteam.mjs (exits non-zero on any finding)
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SourceRegistry, ERR, sha256Hex } from "./registry.mjs";
import { FakeJournal, GitHubConnector } from "./fake-connectors.mjs";

let now = Date.parse("2026-09-23T20:00:00Z");
const clock = () => now;
const dir = mkdtempSync(join(tmpdir(), "lane-m-redteam-"));
const journal = new FakeJournal();
const R = new SourceRegistry({ dir, journal, clock });

const A = { tenantId: "t_alpha", caller: "alice", callerRole: "owner" };
const Aworker = { tenantId: "t_alpha", caller: "w-a", callerRole: "worker" };
const B = { tenantId: "t_beta", caller: "bob", callerRole: "owner" };
const Bworker = { tenantId: "t_beta", caller: "w-b", callerRole: "worker" };

const findings = [];
const check = (name, fn) => {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (e) { findings.push(name); console.error(`FINDING ${name}: ${e.message}`); }
};

// register the same sourceType in two tenants
const srcA = R.registerSource(A, {
  sourceType: "github", providerInstanceId: "alpha/web", displayName: "alpha web",
  owner: "alice", connectionHandle: "credref:github:alpha:oauth",
  grantedCapabilities: ["read.issues"],
  manifestRef: { connectorId: "github", version: "0.3.1", declaredCapabilities: ["read.issues"], credentialType: "oauth2" },
});
const srcB = R.registerSource(B, {
  sourceType: "github", providerInstanceId: "beta/web", displayName: "beta web",
  owner: "bob", connectionHandle: "credref:github:beta:oauth",
  grantedCapabilities: ["read.issues"],
  manifestRef: { connectorId: "github", version: "0.3.1", declaredCapabilities: ["read.issues"], credentialType: "oauth2" },
});
assert.notEqual(srcA.sourceId, srcB.sourceId, "tenant-partitioned ids must differ");
const cA = new GitHubConnector(R, A, Aworker, srcA.sourceId, journal);
const cB = new GitHubConnector(R, B, Bworker, srcB.sourceId, journal);
cA.run(); cB.run();

// -- RT1: cross-tenant read ---------------------------------------------------
check("RT1a tenant B cannot read tenant A's source record", () => {
  assert.throws(() => R.getSource(B, srcA.sourceId), (e) => e.code === ERR.NOT_FOUND);
});
check("RT1b tenant B listSources shows only B's records", () => {
  const list = R.listSources(B).map((s) => s.sourceId);
  assert.ok(!list.includes(srcA.sourceId) && list.includes(srcB.sourceId));
});
check("RT1c tenant B cannot beginRun on tenant A's source", () => {
  assert.throws(() => R.beginRun(Bworker, srcA.sourceId, "w-b"), (e) => e.code === ERR.NOT_FOUND);
});
check("RT1d heartbeat from B's worker against A's lease is rejected", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  assert.throws(
    () => R.heartbeat(Bworker, srcA.sourceId, { runId: lease.runId, outcome: "succeeded", observationsAccepted: 1 }),
    (e) => e.code === ERR.NOT_FOUND || e.code === ERR.FORBIDDEN
  );
});

// -- RT2: cursor forgery --------------------------------------------------------
check("RT2a forged checkpoint value (sha mismatch) is rejected", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  assert.throws(() => R.commitCheckpoint(Aworker, srcA.sourceId, lease.runId, "issues", {
    kind: "etag", value: 'W/"issues-etag-999"', valueSha256: "deadbeef",
    normalizerVersion: "1.0.0", eventSeqFloor: 1,
  }), (e) => e.code === ERR.CURSOR_CORRUPT);
});
check("RT2b committing A's checkpoint blob under B's lease is rejected", () => {
  const leaseA = R.beginRun(Aworker, srcA.sourceId, "w-a");
  const leaseB = R.beginRun(Bworker, srcB.sourceId, "w-b");
  const cpA = R.getSource(A, srcA.sourceId).checkpoints.issues;
  assert.throws(() => R.commitCheckpoint(Bworker, srcB.sourceId, leaseA.runId, "issues", {
    kind: "etag", value: cpA.value, valueSha256: cpA.valueSha256,
    normalizerVersion: "1.0.0", eventSeqFloor: cpA.eventSeqFloor,
  }), (e) => e.code === ERR.LEASE_INVALID);
  // and B cannot commit A's value into B's own record with a wrong floor either
  assert.throws(() => R.commitCheckpoint(Bworker, srcB.sourceId, leaseB.runId, "issues", {
    kind: "etag", value: cpA.value, valueSha256: cpA.valueSha256,
    normalizerVersion: "1.0.0", eventSeqFloor: 0,
  }), (e) => e.code === ERR.FLOOR_NOT_MONOTONIC || e.code === ERR.FLOOR_OUT_OF_RANGE || e.code === ERR.BAD_INPUT);
});
check("RT2c replaying an old checkpoint as new (floor rollback) is rejected", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  const cp = R.getSource(A, srcA.sourceId).checkpoints.issues;
  assert.throws(() => R.commitCheckpoint(Aworker, srcA.sourceId, lease.runId, "issues", {
    kind: "etag", value: cp.value, valueSha256: cp.valueSha256,
    normalizerVersion: "1.0.0", eventSeqFloor: cp.eventSeqFloor - 1,
  }), (e) => e.code === ERR.FLOOR_NOT_MONOTONIC);
});

// -- RT3: health gaming -----------------------------------------------------------
check("RT3a worker cannot assert health in its RunReport", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  assert.throws(() => R.heartbeat(Aworker, srcA.sourceId, {
    runId: lease.runId, outcome: "succeeded", observationsAccepted: 1, status: "healthy",
  }), (e) => e.code === ERR.HEALTH_GAMING);
});
check("RT3b no setHealth API exists on the registry surface", () => {
  assert.equal(typeof R.setHealth, "undefined");
  assert.equal(typeof R.setCheckpoint, "undefined");
  assert.equal(typeof R.unquarantine, "undefined");
});
check("RT3c operator cannot override to healthy over live failures without acknowledging", () => {
  // drive failures first
  const cc = new GitHubConnector(R, A, Aworker, srcA.sourceId, journal);
  now += 3600_000; cc.run({ default: { kind: "down" } });
  now += 3600_000; cc.run({ default: { kind: "down" } });
  assert.throws(() => R.forceHealthOverride(A, srcA.sourceId, "healthy", "looks fine to me"),
    (e) => e.code === ERR.HEALTH_GAMING);
  // an acknowledging override IS allowed (audited, TTL)
  R.forceHealthOverride(A, srcA.sourceId, "degraded", "acknowledge: 2 failures, provider incident per status page", 3600_000);
  assert.equal(R.getSource(A, srcA.sourceId).health.status, "degraded");
});
check("RT3d taxonomy drift: unknown failureCode is rejected, not absorbed", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  assert.throws(() => R.heartbeat(Aworker, srcA.sourceId, {
    runId: lease.runId, outcome: "failed", failureCode: "PROVIDER_HICCUP",
  }), (e) => e.code === ERR.TAXONOMY_DRIFT);
});

// -- RT4: registry as secret store ---------------------------------------------------
check("RT4a token stashed in a checkpoint blob is rejected", () => {
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  const evil = "cursor-part-1:ghp_abcdefghijklmnopqrstuvwx";
  assert.throws(() => R.commitCheckpoint(Aworker, srcA.sourceId, lease.runId, "issues", {
    kind: "cursor", value: evil, valueSha256: sha256Hex(evil),
    normalizerVersion: "1.0.0", eventSeqFloor: 999999,
  }), (e) => e.code === ERR.SECRET_MATERIAL);
});
check("RT4b raw token as connectionHandle is rejected at register", () => {
  assert.throws(() => R.registerSource(B, {
    sourceType: "github", providerInstanceId: "beta/evil", displayName: "evil",
    owner: "bob", connectionHandle: "xoxb-1234567890-abcdefghijklmnopqrst",
    grantedCapabilities: ["read.issues"],
    manifestRef: { connectorId: "github", version: "0.3.1", declaredCapabilities: ["read.issues"], credentialType: "oauth2" },
  }), (e) => e.code === ERR.SECRET_MATERIAL);
});
check("RT4c raw token as connectionHandle is rejected at reconnect", () => {
  assert.throws(() => R.reconnect(B, srcB.sourceId, "sk-live-abcdefghijklmnopqrstuv"),
    (e) => e.code === ERR.SECRET_MATERIAL);
});
check("RT4d worker role cannot read another role's connection handle (redaction)", () => {
  const asWorker = R.getSource(Bworker, srcB.sourceId);
  assert.equal(asWorker.connectionHandle, "redacted");
  const asOwner = R.getSource(B, srcB.sourceId);
  assert.equal(asOwner.connectionHandle, "credref:github:beta:oauth");
});

// -- RT5: quarantined checkpoint misuse ------------------------------------------------
check("RT5a worker fetching incrementally from a quarantined checkpoint is a contract violation", () => {
  R.quarantineCursor(A, srcA.sourceId, "issues", "test quarantine", {});
  const lease = R.beginRun(Aworker, srcA.sourceId, "w-a");
  assert.equal(lease.checkpoints.issues.quarantined, true);
  assert.equal(lease.recoveryMode, true);
  // commit from a NON-recovery lease against a quarantined stream is refused
  const badLease = { ...lease, recoveryMode: false };
  R.leases.set("bad-lease", { ...badLease, runId: "bad-lease" });
  assert.throws(() => R.commitCheckpoint(Aworker, srcA.sourceId, "bad-lease", "issues", {
    kind: "etag", value: 'W/"issues-etag-x"', valueSha256: sha256Hex('W/"issues-etag-x"'),
    normalizerVersion: "1.0.0", eventSeqFloor: 999999,
  }), (e) => e.code === ERR.CURSOR_QUARANTINED || e.code === ERR.FLOOR_OUT_OF_RANGE);
});

console.log(findings.length === 0 ? "\nALL RED-TEAM CASES HOLD" : `\n${findings.length} FINDINGS`);
rmSync(dir, { recursive: true, force: true });
if (findings.length) process.exit(1);
