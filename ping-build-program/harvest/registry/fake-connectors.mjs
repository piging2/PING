/**
 * LANE M — fake connectors for the registry proof.
 *
 * Three scriptable fakes (a git repo, a GitHub repo, a business API).
 * Each one CONSULTS THE REGISTRY before fetching: beginRun -> lease ->
 * fetch from lease.checkpoints -> journal commit -> heartbeat ->
 * commitCheckpoint. The fake connectors own their checkpoint VALUES;
 * the registry owns framing and advancement (opaque, never parsed).
 *
 * Failure injection is scripted per run via `program`: an array of steps
 * the connector plays: { kind: "ok" | "rate-limited" | "down" |
 *   "crash-before-commit" | "permanent" | "corrupt-cursor" | "forged-cursor" }.
 */
import { sha256Hex } from "./registry.mjs";

let journalSeq = 1000;

/** Stub for the phase0 journal seam: commits return a seq range. */
export class FakeJournal {
  constructor() { this.ranges = new Map(); }
  commitRange(runId) {
    if (!this.ranges.has(runId)) {
      const lo = journalSeq + 1;
      const hi = lo + 49; // each fake run "commits" 50 events, shared across its streams
      journalSeq = hi;
      this.ranges.set(runId, [lo, hi]);
    }
    return this.ranges.get(runId);
  }
  get head() { return journalSeq; }
}

/**
 * Base fake connector. Subclasses only define provider-shaped checkpoint
 * values and the fetch simulation.
 */
export class FakeConnector {
  constructor(registry, tenantCtx, workerCtx, sourceId, journal) {
    this.registry = registry;
    this.tenantCtx = tenantCtx;   // { tenantId, caller, callerRole: "owner" }
    this.workerCtx = workerCtx;   // { tenantId, caller: workerId, callerRole: "worker" }
    this.sourceId = sourceId;
    this.journal = journal;
    this.program = [];            // scripted steps
    this.fetches = 0;
  }

  /** One run: consult registry, fetch, commit, heartbeat, advance. */
  run(step = {}) {
    const R = this.registry, W = this.workerCtx, J = this.journal;
    // 1. consult the registry BEFORE fetching
    const gate = R.canFetch(W, this.sourceId);
    if (!gate.allowed) return { skipped: true, reason: gate.reason };
    const lease = R.beginRun(W, this.sourceId, W.caller);
    const streams = this.streams();
    const reports = [];
    let runOutcome = "succeeded";
    let failureCode = null;
    let crashed = false;

    for (const stream of streams) {
      const cp = lease.checkpoints[stream];
      if (cp?.quarantined) {
        // contract: quarantined checkpoints may NOT drive incremental fetch
        if (!step.fullRederive) {
          reports.push({ stream, skipped: "quarantined" });
          continue;
        }
        // full re-derive from scratch (bounded by budgets)
        const value = this.freshValue(stream, 0);
        const [lo, hi] = J.commitRange(lease.runId);
        R.commitCheckpoint(W, this.sourceId, lease.runId, stream, {
          kind: this.checkpointKind(stream), value, valueSha256: sha256Hex(value),
          normalizerVersion: "1.0.0", eventSeqFloor: hi,
        });
        reports.push({ stream, rederived: true, floor: hi });
        continue;
      }
      const action = step[stream] ?? step.default ?? { kind: "ok" };
      this.fetches++;
      if (action.kind === "rate-limited") {
        runOutcome = "failed"; failureCode = "RATE_LIMITED";
        reports.push({ stream, failed: "RATE_LIMITED" });
        continue;
      }
      if (action.kind === "down") {
        runOutcome = "failed"; failureCode = "SOURCE_UNAVAILABLE";
        reports.push({ stream, failed: "SOURCE_UNAVAILABLE" });
        continue;
      }
      if (action.kind === "permanent") {
        runOutcome = "failed"; failureCode = "PERMANENT";
        reports.push({ stream, failed: "PERMANENT" });
        continue;
      }
      // ok path: fetch from checkpoint, produce new checkpoint value
      const from = cp?.value ?? null;
      const value = this.advanceValue(stream, from);
      const [lo, hi] = J.commitRange(lease.runId);
      if (action.kind === "crash-before-commit") {
        // worker crashes AFTER journal commit but BEFORE commitCheckpoint:
        // registry checkpoint must NOT move; next run re-reads the old one.
        crashed = true;
        reports.push({ stream, crashed: true, committedRange: [lo, hi] });
        continue;
      }
      if (action.kind === "corrupt-cursor") {
        // simulate bit-rot in the stored blob between runs
        R.records.get(R.key(W.tenantId, this.sourceId)).checkpoints[stream].value += "X";
        reports.push({ stream, corrupted: true });
        continue;
      }
      R.commitCheckpoint(W, this.sourceId, lease.runId, stream, {
        kind: this.checkpointKind(stream), value, valueSha256: sha256Hex(value),
        normalizerVersion: "1.0.0", eventSeqFloor: hi,
      });
      reports.push({ stream, advanced: true, floor: hi, from });
    }

    // 2. heartbeat with FACTS only (outcome, failureCode, counts)
    const accepted = reports.filter((r) => r.advanced || r.rederived).length;
    const health = R.heartbeat(W, this.sourceId, {
      runId: lease.runId,
      outcome: crashed ? "failed" : runOutcome,
      failureCode: crashed ? "TIMEOUT" : failureCode,
      detail: crashed ? "worker crashed before checkpoint commit" : undefined,
      bytesRead: 4096 * (accepted + 1),
      aiTokensUsed: 0,
      observationsAccepted: accepted,
      observationsRejected: 0,
      terminal: failureCode === "PERMANENT",
    });
    return { runId: lease.runId, reports, health, crashed };
  }
}

export class GitRepoConnector extends FakeConnector {
  streams() { return ["commits"]; }
  checkpointKind() { return "cursor"; }
  freshValue() { return "abc1234"; }
  advanceValue(stream, from) {
    // deterministic chain: each run appends to the fake SHA
    const base = from ?? "abc1234";
    return base.length >= 40 ? base.slice(0, 39) + "f" : base + "0";
  }
}

export class GitHubConnector extends FakeConnector {
  streams() { return ["issues", "prs"]; }
  checkpointKind() { return "etag"; }
  freshValue(stream) { return `W/"${stream}-etag-0"`; }
  advanceValue(stream, from) {
    const n = from ? parseInt(from.split("-").pop().replace('"', ""), 10) + 1 : 1;
    return `W/"${stream}-etag-${n}"`;
  }
}

export class BusinessApiConnector extends FakeConnector {
  streams() { return ["orders", "inventory"]; }
  checkpointKind() { return "opaque-delta"; }
  freshValue() { return "sq_delta_000"; }
  advanceValue(stream, from) {
    const n = from ? parseInt(from.split("_").pop(), 10) + 1 : 1;
    return `sq_delta_${String(n).padStart(3, "0")}`;
  }
}
