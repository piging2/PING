'use strict';
/**
 * T-06 harness driver for classifyUnknownExecution
 * (~/workspace/tenanos-wave/scratch/swarm02-103/src/tenanos/run/run-state-authority.ts).
 *
 * HARNESS ONLY - NOT PRODUCT CODE. Imports the REAL module via node's
 * native type-stripping (no transcription, no re-implementation) and
 * exercises classifyUnknownExecution, projectMission, projectExecution,
 * and isLegalTransition against the fixture-mapped evidence.
 *
 * This implementation is a PURE DECISION FUNCTION: it dispatches nothing,
 * persists nothing, and writes no results. Cells where the fixture's
 * hostile path lives at a seam it does not operate (dedup, result writes,
 * persistence across restarts) are INAPPLICABLE by the verdict rule, with
 * the seam boundary named in the evidence.
 */
const MOD = '/home/hatch/workspace/tenanos-wave/scratch/swarm02-103/src/tenanos/run/run-state-authority.ts';

function ev(list, ok, text) { list.push(`${ok ? 'OK  ' : 'FAIL'} ${text}`); return ok; }
const expiredLease = () => new Date(Date.now() - 1000).toISOString();

async function load() {
  return import(MOD);
}

/* Fixture 01: ack lost after dispatch -> HOLD, never re-execute on unknown. */
async function f01() {
  const m = await load(); const E = []; let pass = true;
  const c = m.classifyUnknownExecution({ effectProven: false, effectAbsent: false, attemptStarted: true });
  pass = ev(E, c.directive === m.ReconcileDirective.HOLD_NEEDS_RECONCILIATION,
    `indeterminate evidence -> HOLD_NEEDS_RECONCILIATION (got ${c.directive})`) && pass;
  pass = ev(E, c.reexecute === false, `reexecute=false (never re-execute on unknown)`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 02: lease expired on a possibly-executed mission -> UNKNOWN_EXECUTION, never PENDING. */
async function f02() {
  const m = await load(); const E = []; let pass = true;
  const p = m.projectMission({ mission_id: 'x', status: 'running', lease_until: expiredLease() });
  pass = ev(E, p === m.CanonicalRunState.UNKNOWN_EXECUTION,
    `expired-lease running projects to UNKNOWN_EXECUTION, not PENDING (got ${p})`) && pass;
  // The hostile at the projection seam: a reaper-style created-reset would
  // project as PENDING, losing "may have executed". R-C forbids it.
  const hostile = m.projectMission({ mission_id: 'x', status: 'created', lease_until: null });
  pass = ev(E, hostile === m.CanonicalRunState.PENDING,
    `control: a genuine created row still projects PENDING (distinction preserved)`) && pass;
  const c = m.classifyUnknownExecution({ effectProven: false, effectAbsent: false, attemptStarted: true });
  pass = ev(E, c.directive === m.ReconcileDirective.HOLD_NEEDS_RECONCILIATION && c.reexecute === false,
    `-> HOLD_NEEDS_RECONCILIATION, reexecute=false`) && pass;
  E.push('NOTE  projectMission R-C ("UNKNOWN_EXECUTION must never silently become ' +
    'PENDING") is this implementation\'s version of the narrowed-reaper property: ' +
    'the wide reaper\'s created-reset is unprojectable as anything but a lie.');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 03: orphaned-started row -> UNKNOWN_EXECUTION -> HOLD. */
async function f03() {
  const m = await load(); const E = []; let pass = true;
  const p = m.projectMission({ mission_id: 'x', status: 'running', lease_until: expiredLease() });
  pass = ev(E, p === m.CanonicalRunState.UNKNOWN_EXECUTION, `orphaned running -> UNKNOWN_EXECUTION`) && pass;
  const pe = m.projectExecution(null);
  pass = ev(E, pe === m.CanonicalRunState.UNKNOWN_EXECUTION,
    `missing execution row (died before INSERT) -> UNKNOWN_EXECUTION, not absent`) && pass;
  const c = m.classifyUnknownExecution({ effectProven: false, effectAbsent: false, attemptStarted: true });
  pass = ev(E, c.directive === m.ReconcileDirective.HOLD_NEEDS_RECONCILIATION && c.reexecute === false,
    `dead worker after possible effect -> HOLD, never FAILED, never re-executed`) && pass;
  // R-A: "worker disappeared" is NOT FAILED - FAILED is unreachable from here.
  pass = ev(E, m.isLegalTransition(m.CanonicalRunState.UNKNOWN_EXECUTION, m.CanonicalRunState.FAILED) === false,
    `no legal edge UNKNOWN_EXECUTION -> FAILED (R-A enforced in the transition map)`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 04: effect PROVEN, result unjournaled -> record success from evidence, never re-execute. */
async function f04() {
  const m = await load(); const E = []; let pass = true;
  const c = m.classifyUnknownExecution({ effectProven: true, effectAbsent: false, attemptStarted: true });
  pass = ev(E, c.directive === m.ReconcileDirective.MARK_SUCCEEDED_FROM_EVIDENCE,
    `proven effect -> MARK_SUCCEEDED_FROM_EVIDENCE (got ${c.directive})`) && pass;
  pass = ev(E, c.reexecute === false, `reexecute=false (R-B: never re-execute a proven effect)`) && pass;
  pass = ev(E, m.isLegalTransition(m.CanonicalRunState.NEEDS_RECONCILIATION, m.CanonicalRunState.SUCCEEDED) === true,
    `legal edge NEEDS_RECONCILIATION -> SUCCEEDED exists for the PROVE EFFECT arm`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 05: duplicate submission. The evidence cube has no submission-count dimension. */
async function f05() {
  const m = await load(); const E = [];
  E.push('INAPPLICABLE  classifyUnknownExecution is a pure function over ' +
    'ReconciliationEvidence {effectProven, effectAbsent, attemptStarted}: it has ' +
    'no intent-identity input, no dedup API, and dispatches nothing. Duplicate ' +
    'submission is prevented at the intent-identity seam (f01 deterministic ' +
    'mission_id + conditional claim; S5 idempotency key + duplicate_attempt), ' +
    'not at the classification seam.');
  void m;
  return { verdict: 'INAPPLICABLE', evidence: E };
}

/* Fixture 06: zombie result. The classifier has no result-write path. */
async function f06() {
  const E = [];
  E.push('INAPPLICABLE  the classifier accepts no result writes and keeps no ' +
    'attempt state: there is no write for a zombie to corrupt and no outcome ' +
    'for it to overwrite. Zombie handling belongs to the write seam ' +
    '(fencing-token CAS in attempt-fencing.ts per the semantic register; ' +
    'status-conditional writes in f01; never-overwrite artifacts in S5).');
  return { verdict: 'INAPPLICABLE', evidence: E };
}

/* Fixture 07: restart with HOLD present. The classifier is stateless. */
async function f07() {
  const m = await load(); const E = [];
  let threw = null;
  try { m.projectMission({ mission_id: 'x', status: 'hold', lease_until: null }); }
  catch (e) { threw = e.message; }
  E.push('INAPPLICABLE  the classifier persists nothing, so a restart cannot ' +
    'change its behavior; HOLD survival is a store property (f01) / index ' +
    'property (S5), not a decision-function property.');
  E.push(`GAP-NAMED  projectMission is fail-closed on f01's 'hold' status: ` +
    `"${threw}". The classifier knows NEEDS_RECONCILIATION but not the 'hold' ` +
    `row status - the two vocabularies are not yet aligned at the projection seam.`);
  return { verdict: 'INAPPLICABLE', evidence: E };
}

/* Fixture 08: reconciler crash -> deterministic re-classification (KB-05 totality). */
async function f08() {
  const m = await load(); const E = []; let pass = true;
  const e1 = { effectProven: false, effectAbsent: false, attemptStarted: true };
  const c1 = m.classifyUnknownExecution(e1);
  const c2 = m.classifyUnknownExecution({ ...e1 }); // "next reconciler attempt"
  pass = ev(E, JSON.stringify(c1) === JSON.stringify(c2),
    `same evidence -> same directive on re-run (crash-safe re-classification)`) && pass;
  pass = ev(E, m.isLegalTransition(m.CanonicalRunState.UNKNOWN_EXECUTION, m.CanonicalRunState.NEEDS_RECONCILIATION) === true,
    `UNKNOWN_EXECUTION may only enter NEEDS_RECONCILIATION (no limbo claimable state)`) && pass;
  pass = ev(E, m.isLegalTransition(m.CanonicalRunState.UNKNOWN_EXECUTION, m.CanonicalRunState.SUCCEEDED) === false &&
    m.isLegalTransition(m.CanonicalRunState.UNKNOWN_EXECUTION, m.CanonicalRunState.PENDING) === false,
    `no shortcut edges UNKNOWN_EXECUTION -> SUCCEEDED / PENDING (chain shape enforced)`) && pass;
  pass = ev(E, m.isLegalTransition(m.CanonicalRunState.NEEDS_RECONCILIATION, m.CanonicalRunState.RUNNING) === true,
    `RETRY_ATTEMPT_WITH_LINEAGE arm: NEEDS_RECONCILIATION -> RUNNING is legal`) && pass;
  E.push('NOTE  the classifier commits nothing: atomicity of the terminal ' +
    'transition and append-only evidence notes are caller/store properties ' +
    '(f01 reconcileHold WHERE-status conditional; S5 append-only index). ' +
    'Its crash-safety contribution is decision totality + determinism.');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

module.exports = { scenarios: { f01, f02, f03, f04, f05, f06, f07, f08 } };
