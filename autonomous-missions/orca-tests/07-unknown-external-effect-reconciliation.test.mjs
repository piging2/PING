/**
 * INVARIANT 07 — unknown external effect → reconciliation, not retry
 * ============================================================
 * GROUNDING: PARTIAL.
 *   Part A (crash-after-accept + stale attempt) is VARIANT-GROUNDED:
 *     MissionRuntime.completionLogicalId, reconcileLostCompletions(),
 *     getFencingToken(), complete(missionId, result, fencingToken) with
 *     STALE_ATTEMPT fail-closed — from the ce002/src/ variant snapshot
 *     (CE-001/CE-002 experiment, NOT confirmed in the live repo).
 *     Part A self-skips unless the variant API is detected.
 *   Part B (external-effect unknown) is DRAFT-UNGROUNDED: no effect
 *     ledger exists in CRX or Orca. The classifier decision table in
 *     Part B is pure logic and RUNS without CRX imports; the integration
 *     half skips with the explicit gap statement.
 *
 * INVARIANT: when a worker's outcome is UNKNOWN, the system must first
 * determine what happened (reconcile) and only then decide whether
 * re-execution is safe (retry) — never blind-retry. Two unknowns:
 *   (a) crash-after-accept: mission row = completed, but the
 *       MISSION_COMPLETED event never reached the journal → re-emit with
 *       the DETERMINISTIC completion identity (dedup no-op if present).
 *   (b) superseded attempt: a reclaimed mission's old worker reports
 *       late → fail closed (STALE_ATTEMPT), never adopt the stale result.
 *   (c) external-effect unknown [GAP]: the worker may have performed a
 *       side effect (email sent, external row written) before dying.
 *       Retrying the mission would DUPLICATE the effect. Required
 *       invention: an effect ledger (idempotency keys on external
 *       effects) + a reconcile-vs-retry classifier. Neither Orca nor CRX
 *       has this — Orca's Retry event is blind and user-driven.
 *
 * Run: node --test 07-unknown-external-effect-reconciliation.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeEventRecorder, uniqueType,
  makeRuntime, loadMissionRuntime, isFencingVariant, cleanupMissions,
} from './harness.mjs';

let pool;
const created = [];

before(async () => {
  pool = makePool();
  await assertScratchDb(pool);
});

after(async () => {
  await cleanupMissions(pool, created).catch(() => {});
  await pool.end();
});

// ---------------------------------------------------------------------------
// Part A — crash-after-accept reconciliation (ce002 variant API).
// ---------------------------------------------------------------------------

test('A1: crash-after-accept re-emits the completion with identical identity (dedup)', async (t) => {
  const MissionRuntime = loadMissionRuntime();
  if (!isFencingVariant(MissionRuntime)) {
    t.skip(
      'VARIANT-ONLY: reconcileLostCompletions() exists in the ce002 snapshot ' +
      '(CE-001 experiment), not confirmed in the live repo. Skipping.'
    );
    return;
  }
  const events = makeEventRecorder();
  const rt = await makeRuntime(pool, events);
  const m = await rt.create(uniqueType('crashaccept'), { event_id: 'e-ca' }, { createdBy: 'test-07' });
  created.push(m);

  await rt.assign(m, 'worker');
  await rt.start(m, 'worker');
  const token = await rt.getFencingToken(m);
  const res = await rt.complete(m, { ok: true }, token);
  assert.equal(res.status, 'ok', 'completion accepted');
  assert.equal(events.ofType('MISSION_COMPLETED').length, 1);

  // Simulate crash-after-accept: the row says completed, but the journal
  // lost the event. (Test-only: drop the recorded emit; the row keeps its
  // deterministic completion identity.)
  events.emitted = events.emitted.filter((e) => e.eventType !== 'MISSION_COMPLETED');

  const report = await rt.reconcileLostCompletions();
  assert.equal(report.reEmitted, 1, 'lost completion re-emitted');

  const re = events.ofType('MISSION_COMPLETED');
  assert.equal(re.length, 1, 'exactly one completion event after reconciliation');

  // Deterministic identity: a second reconciliation is a dedup no-op.
  const report2 = await rt.reconcileLostCompletions();
  assert.equal(report2.reEmitted, 0, 'no duplicate emission on second pass');
  assert.equal(report2.alreadyPresent, 1, 'already-present counted, not re-emitted');
  assert.equal(events.ofType('MISSION_COMPLETED').length, 1, 'still exactly one event');
});

test('A2: superseded attempt fails closed with STALE_ATTEMPT; stale result never adopted', async (t) => {
  const MissionRuntime = loadMissionRuntime();
  if (!isFencingVariant(MissionRuntime)) {
    t.skip('VARIANT-ONLY: attempt fencing (CE-002) not present in the loaded MissionRuntime. Skipping.');
    return;
  }
  const events = makeEventRecorder();
  const rt = await makeRuntime(pool, events);
  const m = await rt.create(uniqueType('stale'), { event_id: 'e-stale' }, { createdBy: 'test-07' });
  created.push(m);

  // Attempt 1: claimed, started, then orphaned (worker dies).
  await rt.assign(m, 'worker-old');
  await rt.start(m, 'worker-old');
  const oldToken = await rt.getFencingToken(m);
  await pool.query(
    `UPDATE ping_missions SET lease_until = NOW() - INTERVAL '1 second' WHERE mission_id = $1`,
    [m]
  );
  await rt.reapExpiredLeases();

  // Attempt 2: a new worker claims (attempts counter bumps = new fencing token).
  await rt.assign(m, 'worker-new');
  await rt.start(m, 'worker-new');
  const newToken = await rt.getFencingToken(m);
  assert.notEqual(newToken, oldToken, 'reclaim mints a new fencing token');

  // The dead worker's late completion with the OLD token fails closed.
  const stale = await rt.complete(m, { worker: 'worker-old', late: true }, oldToken);
  assert.equal(stale.status, 'stale', 'stale attempt fails closed');
  assert.equal(stale.code, 'STALE_ATTEMPT');
  assert.equal(stale.completed, false);
  assert.equal(events.ofType('MISSION_COMPLETED').length, 0, 'stale result emits nothing');

  // The current attempt still completes normally.
  const ok = await rt.complete(m, { worker: 'worker-new' }, newToken);
  assert.equal(ok.status, 'ok');
  assert.equal(events.ofType('MISSION_COMPLETED').length, 1, 'exactly one completion, from the live attempt');
});

// ---------------------------------------------------------------------------
// Part B — external-effect unknown: the explicit invention gap.
// ---------------------------------------------------------------------------
//
// Neither Orca (blind user-driven Retry) nor CRX has an effect ledger.
// The classifier below is the DECISION TABLE the invention must implement.
// It is pure logic: it runs today and pins the required semantics so the
// future effect-ledger integration has a contract to satisfy.

/**
 * PROPOSED CONTRACT (DRAFT-UNGROUNDED):
 *   effect_ledger(ledger_id, mission_id, attempt, effect_key, status)
 *     status: 'confirmed' | 'unknown' | 'absent'
 *   classify(mission, ledgerEntry) -> 'reconcile-adopt' | 'safe-retry' |
 *     'operator-review'
 */
function classifyOutcome({ effectStatus, effectKeyPresent }) {
  if (!effectKeyPresent) return 'safe-retry'; // no external effect was ever attempted
  if (effectStatus === 'confirmed') return 'reconcile-adopt'; // effect happened: adopt, do NOT re-execute
  if (effectStatus === 'unknown') return 'operator-review'; // cannot prove either way: human decides, never blind-retry
  return 'safe-retry'; // 'absent': effect was never performed
}

test('B1: reconcile-vs-retry classifier decision table (pure logic, runs today)', () => {
  // No external effect attempted → retry is safe.
  assert.equal(classifyOutcome({ effectKeyPresent: false }), 'safe-retry');
  // Effect confirmed → reconcile (adopt the outcome), never re-execute.
  assert.equal(
    classifyOutcome({ effectKeyPresent: true, effectStatus: 'confirmed' }),
    'reconcile-adopt'
  );
  // Effect attempted but outcome unknown → NEVER blind-retry.
  assert.equal(
    classifyOutcome({ effectKeyPresent: true, effectStatus: 'unknown' }),
    'operator-review'
  );
  // Effect key present but ledger says absent → the attempt died before
  // acting; retry is safe.
  assert.equal(
    classifyOutcome({ effectKeyPresent: true, effectStatus: 'absent' }),
    'safe-retry'
  );
});

test('B2: effect-ledger integration (gap — skips until the ledger exists)', async (t) => {
  t.skip(
    'DRAFT-UNGROUNDED / INVENTION_REQUIRED: no effect ledger exists in CRX or Orca. ' +
    'Required invention: idempotency keys on external effects + the classifyOutcome ' +
    'contract above wired into the retry path (failWithRetry must consult the ' +
    'ledger before scheduling re-execution). See ORCA-ARCHAEOLOGY-2026-09-23.md §2 #7.'
  );
});
