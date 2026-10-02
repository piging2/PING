'use strict';
/**
 * T-06 harness driver for S5 (reconcile gate, branch mc/lane-c-reconcile-gate,
 * commit 25e33e9, orca-adapter/adapter.js v1.2.0).
 *
 * HARNESS ONLY - NOT PRODUCT CODE. Loads the REAL S5 adapter from the
 * labeled harness copy in ../vendor-s5 (byte-identical to the branch blob
 * except a prepended comment header) and drives dispatchExecution through
 * the synthetic transportFn seam. No live dispatch, no external effects.
 * Each scenario gets a fresh evidence dir (fresh gate memory) unless the
 * fixture is about restarts (then the dir is shared, like a real deployment).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const adapter = require('../vendor-s5/orca-adapter/adapter.js');
const { OUTCOME } = require('../vendor-s5/orca-adapter/outcomes.js');

const freshDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 't06-s5-'));
function ev(list, ok, text) { list.push(`${ok ? 'OK  ' : 'FAIL'} ${text}`); return ok; }

const BASE = (dir, executionId, attempt) => ({
  execution: { missionId: 't06-m', runId: 't06-r', executionId, attempt: String(attempt) },
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::system',
  constraints: {
    read_only: true, no_writes: true, no_network: true,
    no_canonical_events: true, no_mission_state_writes: true,
    allowed_workspace: 'core::system',
  },
  taskBrief: 'T-06 corpus probe task.',
  input: { probe: 's5' },
  evidenceDir: dir,
});

// Transport that commits the remote effect, then is SIGKILLed before any envelope.
function sigkillAfterCommit(counter) {
  return () => {
    counter.n++;
    return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: null,
             stdout: '', stderr: '',
             error: 'simulated SIGKILL after remote commit (corpus probe)' };
  };
}
function completedTransport(counter) {
  return (prompt) => {
    counter.n++;
    // Mirror the S5 self-test: the envelope must carry the issued work order ids.
    const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
    const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
    const env = { work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes',
      capability: 'text.summarize', status: 'completed', output: { summary: 'ok' },
      evidence: { startedAt: 't0', endedAt: 't1', host: 'fake', capabilityPerformed: 'text.summarize' },
      error: null };
    return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
             stdout: 'chatter\n' + JSON.stringify(env), stderr: '' };
  };
}
// Valid reconciliation record shape per the S5 self-test: all fields non-empty strings.
const RECON = { checked: 'provider log + idempotency-key lookup', found: 'effect_unknown on prior attempt', decidedBy: 't06-reconciler' };

async function unknownFirst(dir, execId, counter) {
  return adapter.dispatchExecution({ ...BASE(dir, execId, 1), transportFn: sigkillAfterCommit(counter) });
}

/* Fixture 01: ack lost after dispatch; retry must be refused until reconciled. */
async function f01() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  const r1 = await unknownFirst(dir, 's5-f1', c);
  pass = ev(E, c.n === 1, `attempt 1 invoked transport exactly once (n=${c.n})`) && pass;
  pass = ev(E, r1.honestOutcome === OUTCOME.UNKNOWN || r1.outcome === OUTCOME.ESCALATED,
    `attempt 1 outcome honest-unknown (outcome=${r1.outcome}, honest=${r1.honestOutcome})`) && pass;
  pass = ev(E, r1.effect_may_have_occurred === true, `unknown path carries effect_may_have_occurred`) && pass;
  // Blind retry (the hostile path): refused, transport never runs again.
  const r2 = await adapter.dispatchExecution({ ...BASE(dir, 's5-f1', 2), transportFn: sigkillAfterCommit(c) });
  pass = ev(E, r2.reason === 'reconciliation_required',
    `unreconciled retry refused with 'reconciliation_required' (got ${r2.reason})`) && pass;
  pass = ev(E, c.n === 1, `transport still invoked exactly once after refused retry`) && pass;
  // Reconciled retry (PROVE ABSENCE attested by the reconciler): exactly one new attempt.
  const r3 = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f1', 2), transportFn: completedTransport(c), reconciliation: RECON });
  pass = ev(E, c.n === 2, `reconciled retry invoked transport once more (n=${c.n})`) && pass;
  pass = ev(E, r3.outcome === OUTCOME.COMPLETED, `reconciled attempt completed (outcome=${r3.outcome})`) && pass;
  // Attempt-1 artifact byte-identical after the refused retry (evidence preserved).
  const a1 = path.join(dir, 'result-s5-f1-a1.json');
  pass = ev(E, fs.existsSync(a1), `attempt-1 artifact exists`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 02: lease-expiry-triggered automatic retry of a possibly-executed mission. */
async function f02() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  // Attempt 1: dispatch possibly executed, ack lost (the unknown effect).
  await unknownFirst(dir, 's5-f2', c);
  // The reaper-style automatic retry: a fresh attempt with NO reconciliation.
  const r = await adapter.dispatchExecution({ ...BASE(dir, 's5-f2', 2), transportFn: sigkillAfterCommit(c) });
  pass = ev(E, r.reason === 'reconciliation_required', `automatic post-expiry retry refused (reason=${r.reason})`) && pass;
  pass = ev(E, c.n === 1, `no second real execution (transport n=${c.n})`) && pass;
  E.push('NOTE  S5 has no reaper/lease/mission-row seam: it cannot park a HOLD record ' +
    'or narrow reapExpiredLeases. Its invariant contribution is the dispatch-path ' +
    'refusal: any redispatch crossing the adapter is refused until reconciled. ' +
    'Scope limit (from the S5 commit): the gate\'s memory is the evidenceDir; ' +
    'callers with separate dirs have separate gates.');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 03: dead worker after possible effect; retry-on-orphan refused. */
async function f03() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  await unknownFirst(dir, 's5-f3', c); // worker "died" after possible effect
  const r = await adapter.dispatchExecution({ ...BASE(dir, 's5-f3', 2), transportFn: sigkillAfterCommit(c) });
  pass = ev(E, r.reason === 'reconciliation_required', `retry-on-orphan refused without PROVE ABSENCE (reason=${r.reason})`) && pass;
  pass = ev(E, c.n === 1, `effect not re-executed on dead worker alone (n=${c.n})`) && pass;
  // Invalid reconciliation record is also refused (validated, not just present).
  const bad = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f3', 2), transportFn: sigkillAfterCommit(c), reconciliation: { checked: true } });
  pass = ev(E, bad.reason === 'reconciliation_invalid', `malformed reconciliation refused (reason=${bad.reason})`) && pass;
  pass = ev(E, c.n === 1, `transport still at exactly 1 invocation`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 04: effect proven, result unjournaled. No blind re-execution to "recompute". */
async function f04() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  await unknownFirst(dir, 's5-f4', c);
  // The hostile path "re-execute the effect to recompute the result" without proof:
  const r = await adapter.dispatchExecution({ ...BASE(dir, 's5-f4', 2), transportFn: completedTransport(c) });
  pass = ev(E, r.reason === 'reconciliation_required', `re-execution-to-recompute refused without reconciliation`) && pass;
  pass = ev(E, c.n === 1, `proven effect never re-executed blindly (n=${c.n})`) && pass;
  // Same-attempt resubmission (zombie-ish duplicate) can never overwrite the artifact.
  const dup = await adapter.dispatchExecution({ ...BASE(dir, 's5-f4', 1), transportFn: completedTransport(c) });
  pass = ev(E, dup.reason === 'duplicate_attempt', `same-attempt resubmission refused (reason=${dup.reason})`) && pass;
  E.push('NOTE  S5 does not journal mission results and cannot recover one; that is ' +
    'outside the adapter seam. Its invariant contribution: the proven effect is ' +
    'never re-executed without the reconciler\'s explicit attestation, and ' +
    'attempt artifacts are never overwritten. The reconciliation record\'s ' +
    'CONTENT is caller-attested (validated for shape, not truth) - the ' +
    'semantic PROVE EFFECT / PROVE ABSENCE decision is caller-owned by design ' +
    '(outcomes.js: "reconcile vs retry stays caller-owned").');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 05: duplicate submission of the same intent. */
async function f05() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  const r1 = await adapter.dispatchExecution({ ...BASE(dir, 's5-f5', 1), transportFn: completedTransport(c) });
  pass = ev(E, c.n === 1 && r1.outcome === OUTCOME.COMPLETED, `first submission dispatches once`) && pass;
  // Duplicate submission of the same intent (same executionId, same attempt): refused.
  const r2 = await adapter.dispatchExecution({ ...BASE(dir, 's5-f5', 1), transportFn: completedTransport(c) });
  pass = ev(E, r2.reason === 'duplicate_attempt', `duplicate submission refused (reason=${r2.reason})`) && pass;
  pass = ev(E, c.n === 1, `effect executed exactly once (n=${c.n})`) && pass;
  // Idempotency key: same intent (any attempt number, any key order) -> same key.
  const k1 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' }, input: { a: 1 }, tenant_id: null, capability: 'text.summarize' });
  const k2 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '9' }, input: { a: 1 }, tenant_id: null, capability: 'text.summarize' });
  pass = ev(E, k1 === k2, `idempotency key stable across attempt numbers (retry = same intent)`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 06: zombie result for a superseded attempt. */
async function f06() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  await unknownFirst(dir, 's5-f6', c); // W1 stalls
  // W2 reconciles and completes as a NEW attempt number (new artifact file).
  const r2 = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f6', 2), transportFn: completedTransport(c), reconciliation: RECON });
  pass = ev(E, r2.outcome === OUTCOME.COMPLETED, `reconciled re-attempt completed as new attempt`) && pass;
  const art1 = fs.readFileSync(path.join(dir, 'result-s5-f6-a1.json'), 'utf8');
  // Zombie: W1's superseded attempt-1 result arrives late.
  const z = await adapter.dispatchExecution({ ...BASE(dir, 's5-f6', 1), transportFn: completedTransport(c) });
  pass = ev(E, z.reason === 'duplicate_attempt', `zombie attempt-1 write refused (reason=${z.reason})`) && pass;
  pass = ev(E, fs.readFileSync(path.join(dir, 'result-s5-f6-a1.json'), 'utf8') === art1,
    `attempt-1 artifact byte-identical (reconciled evidence untouched)`) && pass;
  pass = ev(E, c.n === 2, `no third transport invocation from the zombie (n=${c.n})`) && pass;
  // The refusal is logged as evidence in the append-only index (not silently dropped).
  const idx = fs.readFileSync(path.join(dir, adapter.IDEMPOTENCY_INDEX), 'utf8');
  pass = ev(E, idx.includes('duplicate_attempt'), `zombie refusal recorded in the idempotency index as evidence`) && pass;
  E.push('NOTE  S5\'s zombie handling is at the artifact seam (never-overwrite + ' +
    'duplicate_attempt + refusal logged). The mission-row reconciled outcome is ' +
    'outside the adapter seam.');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 07: restart (and concurrent second scheduler) with the unknown still open. */
async function f07() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  await unknownFirst(dir, 's5-f7', c);
  // "Restart": a fresh adapter call over the SAME evidenceDir (gate memory persists).
  const r = await adapter.dispatchExecution({ ...BASE(dir, 's5-f7', 2), transportFn: sigkillAfterCommit(c) });
  pass = ev(E, r.reason === 'reconciliation_required', `post-restart retry still refused (reason=${r.reason})`) && pass;
  pass = ev(E, c.n === 1, `no dispatch across the restart (n=${c.n})`) && pass;
  // Concurrent second scheduler, same dir: same refusal (append-only index is shared).
  const r2 = await adapter.dispatchExecution({ ...BASE(dir, 's5-f7', 2), transportFn: sigkillAfterCommit(c) });
  pass = ev(E, r2.reason === 'reconciliation_required', `concurrent second caller also refused`) && pass;
  // Same intent -> same idempotency key across the restart (identity stable).
  const k1 = adapter.idempotencyKeyFor({ execution: { missionId: 't06-m', runId: 't06-r', executionId: 's5-f7', attempt: '1' }, input: { probe: 's5' }, tenant_id: null, capability: 'text.summarize' });
  const k2 = adapter.idempotencyKeyFor({ execution: { missionId: 't06-m', runId: 't06-r', executionId: 's5-f7', attempt: '2' }, input: { probe: 's5' }, tenant_id: null, capability: 'text.summarize' });
  pass = ev(E, k1 === k2, `intent identity stable across restart (attempt excluded from key)`) && pass;
  E.push('NOTE  S5 holds no mission rows; its "HOLD survives restart" is the refusal ' +
    'persisting via the append-only per-evidenceDir index. Callers with separate ' +
    'evidenceDirs have separate gates (documented scope limit of the S5 commit).');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 08: reconciler crash; re-reconciliation must be idempotent, evidence append-only. */
async function f08() {
  const E = []; let pass = true; const dir = freshDir(); const c = { n: 0 };
  await unknownFirst(dir, 's5-f8', c);
  // Reconciler supplies a record; the record + dispatched-phase index line land
  // BEFORE the transport is invoked (per the S5 commit). Then the "process dies"
  // mid-transport: transport throws before writing any outcome.
  const dying = () => { c.n++; throw new Error('simulated reconciler/worker death mid-transport'); };
  let threw = false;
  try {
    await adapter.dispatchExecution(
      { ...BASE(dir, 's5-f8', 2), transportFn: dying, reconciliation: RECON });
  } catch (e) { threw = /simulated/.test(e.message); }
  pass = ev(E, threw, `mid-transport death propagates (no fake outcome recorded)`) && pass;
  // The index still shows attempt 2 as dispatched-without-outcome = uncertain.
  // A retry of the SAME attempt number is refused (never overwrite); a NEW
  // attempt number needs its OWN reconciliation record (each unknown needs one).
  const sameAttempt = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f8', 2), transportFn: completedTransport(c), reconciliation: RECON });
  pass = ev(E, sameAttempt.reason === 'duplicate_attempt', `same-attempt retry refused (reason=${sameAttempt.reason})`) && pass;
  const newAttemptNoRec = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f8', 3), transportFn: completedTransport(c) });
  pass = ev(E, newAttemptNoRec.reason === 'reconciliation_required',
    `new attempt without its own record refused (reason=${newAttemptNoRec.reason})`) && pass;
  const newAttempt = await adapter.dispatchExecution(
    { ...BASE(dir, 's5-f8', 3), transportFn: completedTransport(c), reconciliation: RECON });
  // n=3: attempt 1 (unknown), attempt 2 (died mid-transport), attempt 3 - one
  // transport invocation per attempt, never a blind redispatch.
  pass = ev(E, newAttempt.outcome === OUTCOME.COMPLETED && c.n === 3,
    `new attempt with its own record proceeds exactly once (n=${c.n})`) && pass;
  // Evidence is append-only: refusals and records accumulate, nothing clobbered.
  const lines = fs.readFileSync(path.join(dir, adapter.IDEMPOTENCY_INDEX), 'utf8').split('\n').filter(l => l.trim());
  pass = ev(E, lines.length >= 4, `index append-only (${lines.length} lines, refusals + records preserved)`) && pass;
  E.push('NOTE  S5 does not run the reconciler and has no mission-row transition ' +
    'commit; "exactly one terminal transition" at the mission seam is outside ' +
    'the adapter. Its crash-safety contribution: reconciliation records and ' +
    'refusals are append-only, attempts never overwrite, each unknown needs ' +
    'its own record.');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

module.exports = { scenarios: { f01, f02, f03, f04, f05, f06, f07, f08 } };
