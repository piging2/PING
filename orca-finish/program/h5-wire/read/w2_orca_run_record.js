'use strict';
/**
 * orca_run_record.js — durable RUN identity on the branch's proven substrate.
 *
 * Lane W2-IMPL-STATE (ORCA FINISH, Wave 2). New file; the branch
 * `feature/orca-autonomy` is read-only for this lane.
 *
 * What this is: the missing durable *run* record. The branch already has
 * durable objective identity, work-order identity, atomic writes, a durable
 * budget, and a SIGKILL-safe single-coordinator claim (PG advisory lock) in
 * `objective-runtime.js`. What it does NOT have is a run row: the loop's
 * RUN_ID is wall-clock derived (`orca_control_loop.js:115`), so a restarted
 * coordinator cannot reconstruct the run — only the objective.
 *
 * Substrate decision (see GAP-ANALYSIS.md): the run record lives in the
 * branch's durable substrate — atomic JSON files under
 * PING_DATA_ROOT/objectives/<objective_id>/runs/<run_id>.json — NOT in new
 * PG tables. PG tables would be a second durable store beside `objectives/`
 * (a second-writer risk against the map's record 5, one-writer / SURVIVES).
 * The fencing-token CAS *intent* (exactly one writer advances a running row)
 * is provided by the advisory-lock claim; the record still carries
 * `fencing_epoch` so a stale holder's late writes are detectable.
 *
 * Wiring (wire, don't fork): every function takes `rt`, the objective-runtime
 * module shape `{ atomicWrite, readJson, objectiveDir }`. Production callers
 * pass the branch's `objective-runtime.js`; tests pass a fake or the real
 * module by absolute path until the branches merge. This module contains NO
 * copy of the branch's code.
 *
 * Secrets: the record stores `input_snapshot_ref` (content-addressed
 * reference) and never raw input/prompt material. Writers MUST NOT put
 * secrets in `principal`, `notes`, or any other free-text field.
 */

const crypto = require('crypto');
const path = require('path');

// ---------------------------------------------------------------------------
// Pure run-state transition table. Total: applyRunTransition(from, event)
// returns the target state or throws ErrIllegalTransition. No I/O.
// Runs are not delegation units: this is the run lifecycle, distinct from the
// branch's 10-state WorkOrder ledger (policy/orca_status_model.js).
// ---------------------------------------------------------------------------

const RUN_STATES = Object.freeze([
  'NOT_STARTED', 'STARTED', 'SUSPENDED',
  'SUCCEEDED', 'FAILED', 'OUTCOME_UNKNOWN', 'CANCELLED',
]);

const RUN_EVENTS = Object.freeze([
  'START', 'SUSPEND', 'RESUME', 'SUCCEED', 'FAIL',
  'MARK_UNKNOWN', 'CANCEL', 'RETRY',
]);

const RUN_TRANSITIONS = Object.freeze({
  NOT_STARTED:   { START: 'STARTED', CANCEL: 'CANCELLED' },
  STARTED:       { SUSPEND: 'SUSPENDED', SUCCEED: 'SUCCEEDED', FAIL: 'FAILED',
                   MARK_UNKNOWN: 'OUTCOME_UNKNOWN', CANCEL: 'CANCELLED' },
  SUSPENDED:     { RESUME: 'STARTED', CANCEL: 'CANCELLED' },
  SUCCEEDED:     {},
  // FAILED is retryable-terminal: RETRY re-queues the run for a fresh attempt
  // (attempt_seq+1 on the work orders). OUTCOME_UNKNOWN is terminal except
  // for administrative CANCEL: post-side-effect-boundary ambiguity must never
  // be auto-retried (mechanism-map record 8).
  FAILED:        { RETRY: 'NOT_STARTED', CANCEL: 'CANCELLED' },
  OUTCOME_UNKNOWN: { CANCEL: 'CANCELLED' },
  CANCELLED:     {},
});

class ErrIllegalTransition extends Error {
  constructor(from, event) {
    super(`orca_run_record: illegal run transition ${from} + ${event}`);
    this.name = 'ErrIllegalTransition';
    this.from = from;
    this.event = event;
  }
}

function applyRunTransition(from, event) {
  const edges = RUN_TRANSITIONS[from];
  if (!edges) throw new ErrIllegalTransition(from, event);
  const to = edges[event];
  if (!to) throw new ErrIllegalTransition(from, event);
  return to;
}

function legalRunEvents(from) {
  return Object.keys(RUN_TRANSITIONS[from] || {});
}

function isTerminalRunState(state) {
  return state === 'SUCCEEDED' || state === 'OUTCOME_UNKNOWN' || state === 'CANCELLED';
}

// ---------------------------------------------------------------------------
// Run identity. Deterministic from (objective_id, run_seq): same inputs give
// the same id, so a duplicate registration names the same run instead of a
// conflicting second run. The id is a name, never a capability.
// ---------------------------------------------------------------------------

function deriveRunId(objectiveId, runSeq) {
  if (!objectiveId || typeof objectiveId !== 'string') {
    throw new Error('deriveRunId: objectiveId required');
  }
  if (!Number.isInteger(runSeq) || runSeq < 1) {
    throw new Error('deriveRunId: runSeq must be a positive integer');
  }
  return crypto.createHash('sha256')
    .update(`run:${objectiveId}:${runSeq}`, 'utf8')
    .digest('hex');
}

function runsDir(rt, dataRoot, objectiveId) {
  return path.join(rt.objectiveDir(dataRoot, objectiveId), 'runs');
}

function runPath(rt, dataRoot, objectiveId, runId) {
  return path.join(runsDir(rt, dataRoot, objectiveId), `${runId}.json`);
}

function objectiveRecordPath(rt, dataRoot, objectiveId) {
  return path.join(rt.objectiveDir(dataRoot, objectiveId), 'objective.json');
}

/**
 * Register a new durable run for an objective. Consumes one unit from the
 * objective's durable run-sequence counter (crash-safe: the counter lives in
 * objective.json, written atomically). Re-running after a crash registers a
 * NEW run; the old run's record is left untouched for forensics.
 */
function registerRun(rt, dataRoot, objectiveId, opts = {}) {
  const recordPath = objectiveRecordPath(rt, dataRoot, objectiveId);
  const record = rt.readJson(recordPath);
  if (!record) throw new Error(`registerRun: unknown objective ${objectiveId}`);
  const runSeq = (Number.isInteger(record.run_seq_used) ? record.run_seq_used : 0) + 1;
  const runId = deriveRunId(objectiveId, runSeq);
  const now = new Date().toISOString();
  const run = {
    run_id: runId,
    objective_id: objectiveId,
    run_seq: runSeq,
    // Tenant scoping (O-1 hardening): sourced from the adapter namespace
    // (tenant::<id>); carried on every durable row.
    tenant_id: opts.tenantId || null,
    principal: opts.principal || 'ping:external-agent-adapter',
    // Secret-free: content-addressed reference, never raw input.
    input_snapshot_ref: opts.inputSnapshotRef || null,
    status: 'NOT_STARTED',
    worktree_path: opts.worktreePath || null,
    branch: opts.branch || null,
    lease: { holder_id: null, expires_at: null, fencing_epoch: 0 },
    checkpoint_version: 0,
    state_snapshot_ref: null,
    created_at: now,
    updated_at: now,
  };
  rt.atomicWrite(runPath(rt, dataRoot, objectiveId, runId), JSON.stringify(run, null, 2) + '\n');
  record.run_seq_used = runSeq;
  record.updated_at = now;
  rt.atomicWrite(recordPath, JSON.stringify(record, null, 2) + '\n');
  return run;
}

function loadRun(rt, dataRoot, objectiveId, runId) {
  return rt.readJson(runPath(rt, dataRoot, objectiveId, runId));
}

function listRuns(rt, dataRoot, objectiveId) {
  const fs = require('fs');
  let files;
  try {
    files = fs.readdirSync(runsDir(rt, dataRoot, objectiveId));
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => rt.readJson(path.join(runsDir(rt, dataRoot, objectiveId), f)))
    .filter(Boolean)
    .sort((a, b) => a.run_seq - b.run_seq);
}

/**
 * Advance a run's status through the transition table. The write is atomic;
 * the caller MUST hold the coordinator advisory lock (the single-writer
 * fence) — this module does not acquire it and will not guess.
 */
function transitionRun(rt, dataRoot, objectiveId, runId, event) {
  const run = loadRun(rt, dataRoot, objectiveId, runId);
  if (!run) throw new Error(`transitionRun: unknown run ${runId}`);
  const to = applyRunTransition(run.status, event); // throws on illegal
  run.status = to;
  run.updated_at = new Date().toISOString();
  rt.atomicWrite(runPath(rt, dataRoot, objectiveId, runId), JSON.stringify(run, null, 2) + '\n');
  return run;
}

/**
 * Fencing-token claim on a run row. Compare-and-swap on fencing_epoch:
 * the caller presents the epoch it read; if the durable epoch moved, the
 * claim is refused and the caller MUST re-read instead of proceeding.
 * Returns { ok: true, fencing_epoch } or { ok: false, reason }.
 *
 * This is the file-substrate embodiment of the O-1 claim/resume CAS. The
 * primary single-writer fence remains the PG advisory-lock coordinator
 * claim; the epoch makes a stale holder's late writes detectable even if
 * the lock discipline is ever bypassed.
 */
function claimRun(rt, dataRoot, objectiveId, runId, { holderId, ttlMs, expectedEpoch }) {
  if (!holderId || typeof holderId !== 'string') {
    throw new Error('claimRun: holderId required');
  }
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('claimRun: ttlMs must be a positive integer');
  }
  const run = loadRun(rt, dataRoot, objectiveId, runId);
  if (!run) throw new Error(`claimRun: unknown run ${runId}`);
  if (run.lease.fencing_epoch !== expectedEpoch) {
    return { ok: false, reason: 'stale-epoch', fencing_epoch: run.lease.fencing_epoch };
  }
  run.lease = {
    holder_id: holderId,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    fencing_epoch: run.lease.fencing_epoch + 1,
  };
  run.updated_at = new Date().toISOString();
  rt.atomicWrite(runPath(rt, dataRoot, objectiveId, runId), JSON.stringify(run, null, 2) + '\n');
  return { ok: true, fencing_epoch: run.lease.fencing_epoch };
}

/**
 * Versioned, monotonic checkpoint on the run record. The snapshot is a
 * content-addressed reference (secret-free); the version only moves forward.
 */
function checkpointRun(rt, dataRoot, objectiveId, runId, stateSnapshotRef) {
  if (!stateSnapshotRef || typeof stateSnapshotRef !== 'string') {
    throw new Error('checkpointRun: stateSnapshotRef required');
  }
  const run = loadRun(rt, dataRoot, objectiveId, runId);
  if (!run) throw new Error(`checkpointRun: unknown run ${runId}`);
  run.checkpoint_version += 1;
  run.state_snapshot_ref = stateSnapshotRef;
  run.updated_at = new Date().toISOString();
  rt.atomicWrite(runPath(rt, dataRoot, objectiveId, runId), JSON.stringify(run, null, 2) + '\n');
  return run;
}

module.exports = {
  RUN_STATES,
  RUN_EVENTS,
  RUN_TRANSITIONS,
  ErrIllegalTransition,
  applyRunTransition,
  legalRunEvents,
  isTerminalRunState,
  deriveRunId,
  runsDir,
  runPath,
  registerRun,
  loadRun,
  listRuns,
  transitionRun,
  claimRun,
  checkpointRun,
};
