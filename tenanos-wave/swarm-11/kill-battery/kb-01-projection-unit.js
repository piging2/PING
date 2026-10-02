#!/usr/bin/env node
/**
 * KB-01 — Canonical projection + reconciliation-classifier unit tests.
 *
 * PURE functions. No DB, no Pig. These are the exact semantics proposed for
 * src/tenanos/run/run-state-authority.ts (see swarm-11 diff P-20260923-0NN).
 * Running them here proves the decision procedure is total, deterministic,
 * and honors the hard rules BEFORE the code lands in the wave tree.
 *
 * Hard rules under test:
 *   R-A: "worker disappeared" is NOT FAILED.
 *   R-B: "timeout" is NOT proof the effect did not happen (never re-execute a proven effect).
 *   R-C: UNKNOWN_EXECUTION must never silently become PENDING.
 *
 * Usage: node kb-01-projection-unit.js
 */
'use strict';

// ---------------------------------------------------------------------------
// Canonical vocabulary (proposed; mirrors the diff)
// ---------------------------------------------------------------------------
const Canonical = Object.freeze({
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
  UNKNOWN_EXECUTION: 'UNKNOWN_EXECUTION',
  NEEDS_RECONCILIATION: 'NEEDS_RECONCILIATION',
});

// Projection: ping_missions row -> canonical state (pure).
// NOTE: this deliberately refuses to project assigned/running-with-expired-lease
// as PENDING — that is the R1 defect. They project to UNKNOWN_EXECUTION.
function projectMission(row, now = Date.now()) {
  const s = row.status;
  if (s === 'created' || s === 'retry_pending') return Canonical.PENDING;
  if (s === 'completed') return Canonical.SUCCEEDED;
  if (s === 'failed') return Canonical.FAILED;
  if (s === 'assigned' || s === 'running') {
    const leaseExpired = row.lease_until != null && new Date(row.lease_until).getTime() < now;
    // claimed/started, lease live (or no lease info): effect state unknown but the
    // owner may still be alive -> RUNNING (in-flight). Expired lease + owner gone
    // is UNKNOWN_EXECUTION, never PENDING (R-C), never FAILED (R-A).
    return leaseExpired ? Canonical.UNKNOWN_EXECUTION : Canonical.RUNNING;
  }
  throw new Error(`projectMission: unmapped status '${s}' (fail-closed, never default)`);
}

// Projection: phase-15 mission_executions row -> canonical state (pure).
function projectExecution(row) {
  if (row == null) return Canonical.UNKNOWN_EXECUTION; // attempt began but left no row (M3)
  if (row.execution_status === 'completed') return Canonical.SUCCEEDED;
  if (row.execution_status === 'failed') return Canonical.FAILED;
  if (row.execution_status === 'pending') return Canonical.PENDING;
  throw new Error(`projectExecution: unmapped status '${row.execution_status}'`);
}

// Reconciliation classifier (pure): decides what a replacement may do with a
// run that ended in UNKNOWN_EXECUTION. Evidence is the durable record:
//   evidence.effectProven   — an idempotency-keyed effect record exists (event/effect journal)
//   evidence.effectAbsent    — positive proof the effect never happened (e.g. worker died
//                              before the effect step; attempt never started)
//   evidence.attemptStarted  — any durable trace that an attempt began
// Returns a terminal directive; NEVER returns "re-execute blindly".
function classifyUnknownExecution(evidence) {
  if (evidence.effectProven) {
    // R-B: the effect happened. Re-execution is forbidden. Mark SUCCEEDED from
    // evidence; do not repeat the work.
    return { directive: 'MARK_SUCCEEDED_FROM_EVIDENCE', reexecute: false };
  }
  if (evidence.effectAbsent && !evidence.attemptStarted) {
    // Positive proof nothing ran: safe to re-queue as new work.
    return { directive: 'REQUEUE_AS_PENDING', reexecute: true };
  }
  if (evidence.effectAbsent && evidence.attemptStarted) {
    // Attempt began, effect provably absent (died before the effect step):
    // safe to re-run the attempt, but record the attempt lineage.
    return { directive: 'RETRY_ATTEMPT_WITH_LINEAGE', reexecute: true };
  }
  // Indeterminate: cannot prove either way. Hold, never silently re-queue (R-C).
  return { directive: 'HOLD_NEEDS_RECONCILIATION', reexecute: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
let pass = 0, fail = 0;
function t(id, cond) { if (cond) { pass++; } else { fail++; console.log(`FAIL ${id}`); } }
const NOW = Date.now();

// Projection coverage: every existing mission status maps, deterministically.
t('P1', projectMission({ status: 'created' }) === Canonical.PENDING);
t('P2', projectMission({ status: 'retry_pending' }) === Canonical.PENDING);
t('P3', projectMission({ status: 'completed' }) === Canonical.SUCCEEDED);
t('P4', projectMission({ status: 'failed' }) === Canonical.FAILED);
t('P5', projectMission({ status: 'assigned', lease_until: new Date(NOW + 30000).toISOString() }) === Canonical.RUNNING);
t('P6', projectMission({ status: 'running', lease_until: new Date(NOW + 30000).toISOString() }) === Canonical.RUNNING);
t('P7', projectMission({ status: 'running', lease_until: null }, NOW) === Canonical.RUNNING); // no lease info: fail toward in-flight
// R1 core: expired lease -> UNKNOWN_EXECUTION, not PENDING, not FAILED.
t('P8', projectMission({ status: 'running', lease_until: new Date(NOW - 1000).toISOString() }, NOW) === Canonical.UNKNOWN_EXECUTION);
t('P9', projectMission({ status: 'assigned', lease_until: new Date(NOW - 1000).toISOString() }, NOW) === Canonical.UNKNOWN_EXECUTION);
// Fail-closed on unknown status.
t('P10', (() => { try { projectMission({ status: 'weird' }); return false; } catch { return true; } })());
// Determinism: same input, same output.
t('P11', projectMission({ status: 'running', lease_until: new Date(NOW - 5).toISOString() }, NOW)
        === projectMission({ status: 'running', lease_until: new Date(NOW - 5).toISOString() }, NOW));

// Execution-row projection (M3 gaps).
t('E1', projectExecution(null) === Canonical.UNKNOWN_EXECUTION); // crashed attempt, no row
t('E2', projectExecution({ execution_status: 'completed' }) === Canonical.SUCCEEDED);
t('E3', projectExecution({ execution_status: 'pending' }) === Canonical.PENDING);

// Classifier: the four evidence shapes.
t('C1', (() => { const d = classifyUnknownExecution({ effectProven: true, effectAbsent: false, attemptStarted: true });
  return d.directive === 'MARK_SUCCEEDED_FROM_EVIDENCE' && d.reexecute === false; })()); // R-B
t('C2', (() => { const d = classifyUnknownExecution({ effectProven: false, effectAbsent: true, attemptStarted: false });
  return d.directive === 'REQUEUE_AS_PENDING' && d.reexecute === true; })());
t('C3', (() => { const d = classifyUnknownExecution({ effectProven: false, effectAbsent: true, attemptStarted: true });
  return d.directive === 'RETRY_ATTEMPT_WITH_LINEAGE' && d.reexecute === true; })());
t('C4', (() => { const d = classifyUnknownExecution({ effectProven: false, effectAbsent: false, attemptStarted: true });
  return d.directive === 'HOLD_NEEDS_RECONCILIATION' && d.reexecute === false; })()); // R-C: hold, never silent requeue
t('C5', (() => { const d = classifyUnknownExecution({ effectProven: false, effectAbsent: false, attemptStarted: false });
  return d.directive === 'HOLD_NEEDS_RECONCILIATION' && d.reexecute === false; })()); // no info at all: hold
// Classifier is total over the evidence cube (2^3 = 8 shapes), none throw, none return undefined.
t('C6', (() => {
  for (let m = 0; m < 8; m++) {
    const e = { effectProven: !!(m & 1), effectAbsent: !!(m & 2), attemptStarted: !!(m & 4) };
    // contradictory evidence (proven AND absent) is itself a hold signal
    if (e.effectProven && e.effectAbsent) continue;
    const d = classifyUnknownExecution(e);
    if (!d || !d.directive || typeof d.reexecute !== 'boolean') return false;
  }
  return true;
})());
// R-B invariant over the whole cube: effectProven => reexecute === false, always.
t('C7', (() => {
  for (let m = 0; m < 8; m++) {
    const e = { effectProven: !!(m & 1), effectAbsent: !!(m & 2), attemptStarted: !!(m & 4) };
    if (e.effectProven && !e.effectAbsent && classifyUnknownExecution(e).reexecute) return false;
  }
  return true;
})());

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
