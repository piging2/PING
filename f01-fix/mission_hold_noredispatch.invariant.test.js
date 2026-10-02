'use strict';
/**
 * HOLD NO-REDISPATCH INVARIANT — P0 HOLD/reaper lane (Directive B §11,
 * 2026-09-24).
 *
 * Failing-first tests for the no-redispatch invariant on the PING
 * mission/scheduler F-01 state machine (f01-fix/mission_runtime.js +
 * mission_scheduler.js — the existing authority; no parallel machine).
 *
 * Standing semantics under test:
 *   (a) an UNKNOWN consequential effect whose lease expires lands in HOLD,
 *       never back in `created`;
 *   (b) the scheduler must not redispatch it until reconciliation evidence
 *       produces SAFE_TO_RETRY (proven idempotency contract) or another
 *       terminal state;
 *   (c) runtime restart must not collapse HOLD back to dispatchable;
 *   (d) timeout alone never converts UNKNOWN to success or failure.
 *
 * The hostile core: dispatch the same consequential operation twice through
 * the reconciliation path and prove effect #2 cannot happen without a proven
 * idempotency contract. "Probably safe" must throw.
 *
 * Run: node --test mission_hold_noredispatch.invariant.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { MissionRuntime } = require('./mission_runtime.js');
const { MissionScheduler } = require('./mission_scheduler.js');
const { FakePool } = require('./fake_mission_pool.js');

// ── Controllable clock ──────────────────────────────────────────────
let fakeNow = Date.now();
const realDateNow = Date.now;
Date.now = () => fakeNow;
const iso = () => new Date(fakeNow).toISOString();
const pastIso = (msAgo) => new Date(fakeNow - msAgo).toISOString();

// ── Harness ─────────────────────────────────────────────────────────
function makeHarness(opts = {}) {
  fakeNow = realDateNow();
  const pool = new FakePool({ now: () => fakeNow });
  const emitted = [];
  const eventRuntime = {
    emitted,
    async emit(type, source, payload = {}) { emitted.push({ type, source, payload }); return { status: 'ok' }; },
  };
  const harness = {
    pool, events: eventRuntime, workerInvocations: 0,
    _behavior: opts.worker || 'hanging',
    // Downstream effect ledger, keyed by logical_operation_id. The
    // 'ledgerIdempotent' worker models a downstream that dedupes on the
    // operation's idempotency key — the concrete meaning of "a proven
    // idempotency contract for the exact operation".
    effectLedger: new Map(),
  };
  const behaviors = {
    hanging: (h) => () => { h.workerInvocations++; return new Promise(() => {}); },
    ok: (h) => async () => { h.workerInvocations++; return { status: 'ok' }; },
    ledgerIdempotent: (h) => async (event) => {
      h.workerInvocations++;
      const row = h.pool.missions.get(event.mission_id);
      const opId = row ? row.logical_operation_id : event.mission_id;
      if (!h.effectLedger.has(opId)) h.effectLedger.set(opId, 1); // deduped downstream
      return { status: 'ok' };
    },
    // Spec-literal crash model: the worker REALLY performs the consequential
    // effect (downstream ledger records it), then the acknowledgement is
    // destroyed — the promise never settles, so the dispatch times out with
    // the outcome genuinely unknown.
    effectThenHang: (h) => (event) => {
      h.workerInvocations++;
      const row = h.pool.missions.get(event.mission_id);
      const opId = row ? row.logical_operation_id : event.mission_id;
      h.effectLedger.set(opId, (h.effectLedger.get(opId) || 0) + 1); // real effect, no dedup
      return new Promise(() => {}); // ack destroyed
    },
  };
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {}, witness: {} } }),
    dispatch: (...a) => {
      if (a[0] && a[0].mission_id) harness.dispatchedMissionIds.push(a[0].mission_id);
      return behaviors[harness._behavior](harness)(...a);
    },
  };
  harness.dispatchedMissionIds = [];
  harness.workerRuntime = workerRuntime;
  harness.setWorker = (b) => { harness._behavior = b; };
  const mr = new MissionRuntime({ pool, eventRuntime });
  const sched = new MissionScheduler({
    missionRuntime: mr,
    workerRuntime,
    eventRuntime,
    retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 },
    pollIntervalMs: 3600000,
    dispatchTimeoutMs: opts.dispatchTimeoutMs,
    stuckThresholdMs: opts.stuckThresholdMs,
  });
  harness.mr = mr;
  harness.sched = sched;
  harness.advance = (ms) => { fakeNow += ms; };
  // "Process restart": brand-new runtime + scheduler over the same pool and
  // event bus, with fresh in-memory _processing/_reconciled sets.
  harness.restartedScheduler = (workerBehavior) => {
    const rt = new MissionRuntime({ pool, eventRuntime });
    const wr = {
      getStats: () => ({ workers: { observation: {}, witness: {} } }),
      dispatch: (...a) => {
        if (a[0] && a[0].mission_id) harness.dispatchedMissionIds.push(a[0].mission_id);
        return behaviors[workerBehavior || harness._behavior](harness)(...a);
      },
    };
    return new MissionScheduler({
      missionRuntime: rt, workerRuntime: wr, eventRuntime,
      retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 },
      pollIntervalMs: 3600000,
      dispatchTimeoutMs: opts.dispatchTimeoutMs,
      stuckThresholdMs: opts.stuckThresholdMs,
    });
  };
  return harness;
}

function holdState(pool, id) {
  const m = pool.missions.get(id);
  return {
    status: m.status, outcome: m.outcome, retry_eligibility: m.retry_eligibility,
    reconciliation_required: m.reconciliation_required, effect_count: m.effect_count,
    logical_operation_id: m.logical_operation_id,
  };
}
function assertHoldInvariant(pool, id, label) {
  assert.deepEqual(holdState(pool, id), {
    status: 'hold',
    outcome: 'UNKNOWN',
    retry_eligibility: false,
    reconciliation_required: true,
    effect_count: 1,
    logical_operation_id: id,
  }, `${label}: HOLD invariant violated`);
}
async function dispatchAndHold(h, eventId, missionType = 'LEAD_FOLLOWUP') {
  const id = await h.mr.create(missionType, {
    event_id: eventId, event_type: 'LEAD_CREATED', correlation_id: `corr-${eventId}`,
  });
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll(); // dispatch hangs -> timeout -> HOLD
  } finally {
    clearInterval(keepAlive);
  }
  return id;
}

// ── HOSTILE: "probably safe" is not a proof ─────────────────────────

test('hostile: safe_to_retry with vague evidence but no proof throws — HOLD unchanged', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-1');
  assertHoldInvariant(h.pool, id, 'before hostile reconcile');

  // No effectProvenAbsent, no idempotencyContract — just a belief.
  await assert.rejects(
    h.mr.reconcileHold(id, 'safe_to_retry', {
      evidence: 'reconciler judges it is probably safe to retry; downstream looked fine',
    }),
    /proven|idempotency/i,
    '"probably safe" must throw: SAFE_TO_RETRY needs proof, not belief'
  );
  assertHoldInvariant(h.pool, id, 'after rejected hostile reconcile');

  // And the scheduler still cannot dispatch it.
  h.setWorker('ok');
  await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'no redispatch after rejected reconcile');
  assertHoldInvariant(h.pool, id, 'after poll');
  assert.ok(!h.dispatchedMissionIds.slice(1).includes(id), 'never dispatched twice');
});

test('hostile: effect #2 cannot be produced through the reconciliation path without a proven idempotency contract', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-2');
  assertHoldInvariant(h.pool, id, 'before hostile chain');

  // TRY HARD: resolve to SAFE_TO_RETRY on bare assertion, then poll with a
  // healthy worker — this is the forbidden automatic second effect.
  let resolved = false;
  try {
    resolved = await h.mr.reconcileHold(id, 'safe_to_retry', {
      evidence: 'timeout was probably transient; retrying should be fine',
    });
  } catch (err) {
    assert.match(String((err && err.message) || err), /proven|idempotency/i);
  }
  assert.equal(resolved, false, 'unproven SAFE_TO_RETRY must not resolve');

  h.setWorker('ledgerIdempotent');
  for (let i = 0; i < 3; i++) await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'exactly one worker invocation total');
  assert.equal(h.pool.missions.get(id).effect_count, 1, 'effect count never reaches 2');
  assert.equal(h.effectLedger.size, 0, 'no downstream effect recorded past the first attempt');
  assertHoldInvariant(h.pool, id, 'end of hostile chain');
});

test('contracted path: proven idempotency contract allows exactly the contracted re-execution — downstream still sees one effect', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-3');
  assertHoldInvariant(h.pool, id, 'before contracted reconcile');

  const resolved = await h.mr.reconcileHold(id, 'safe_to_retry', {
    evidence: {
      by: 'reconciler-7',
      method: 'downstream ledger query by idempotency key',
      found: 'operation lead-followup-send carries idempotency key idem:evt-nr-3; downstream dedupes on it',
    },
    idempotencyContract: {
      operation: 'lead-followup-send',
      key: 'idem:evt-nr-3',
      verified_at: iso(),
    },
  });
  assert.equal(resolved, true, 'proven contract resolves');
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'created');
  assert.equal(m.outcome, 'SAFE_TO_RETRY');
  assert.equal(m.retry_eligibility, true);
  assert.equal(m.effect_count, 1, 'count kept: the effect may already have happened once');
  assert.equal(m.logical_operation_id, id, 'same logical operation identity');

  // The contracted re-execution is allowed — and the idempotent downstream
  // collapses it to a single effect.
  h.setWorker('ledgerIdempotent');
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'completed');
  assert.equal(h.workerInvocations, 2, 'one ambiguous dispatch + one contracted re-execution');
  assert.equal(h.effectLedger.get(id), 1, 'downstream ledger shows exactly one effect');
  assert.equal(h.effectLedger.size, 1);
});

// ── (d) timeout alone never converts UNKNOWN to success or failure ──

test('timeout alone never converts UNKNOWN to success or failure', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-4');

  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'hold');
  assert.equal(m.outcome, 'UNKNOWN', 'timeout leaves the outcome UNKNOWN, not FAILED');
  assert.ok(!['completed', 'failed'].includes(m.status), 'timeout never completes or fails');
  assert.ok(!h.events.emitted.some(e =>
    (e.type === 'MISSION_FAILED' || e.type === 'MISSION_COMPLETED') &&
    e.payload.missionId === id),
  'no terminal event emitted for a timed-out dispatch');

  // The fail path rejects timeout-classified outcomes at its boundary.
  const probe = { mission_id: id, mission_type: 'LEAD_FOLLOWUP', payload: '{}', retries: 0 };
  await assert.rejects(h.sched._failMission(probe, 'dispatch timeout after 50ms', 'timeout'), /not a proven failure/);
  await assert.rejects(h.sched._failMission(probe, 'lost acknowledgement', 'unknown'), /not a proven failure/);
  assertHoldInvariant(h.pool, id, 'fail-gate rejections change nothing');
});

// ── (c) restart must not collapse HOLD back to dispatchable ─────────

test('restart with a stale lease on the HOLD row cannot make it dispatchable', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-5');
  assertHoldInvariant(h.pool, id, 'before restart');

  // Adversarial: a stale lease somehow present on the HOLD row (e.g. written
  // before the park, or injected). Every automatic mechanism must ignore it.
  h.pool.missions.get(id).lease_until = pastIso(5000);
  h.advance(120000);
  assert.equal(await h.mr.reapExpiredLeases(), 0, 'reaper ignores HOLD rows');
  assert.deepEqual(await h.mr.findOrphanedRunning(), [], 'orphan escalation ignores HOLD rows');
  assert.equal(await h.mr.renewLease(id), 0, 'lease renewal refuses HOLD rows');
  assert.equal(await h.sched.reconcileStuckRunning(), 0, 'watchdog ignores HOLD rows');
  assertHoldInvariant(h.pool, id, 'after automatic machinery');

  // Process restart: new runtime + scheduler, willing worker, stale lease
  // re-injected to simulate the worst case.
  const rt2 = new MissionRuntime({ pool: h.pool, eventRuntime: h.events });
  const sched2 = h.restartedScheduler('ok');
  h.pool.missions.get(id).lease_until = pastIso(5000);
  await sched2._poll();
  await sched2.reconcileStuckRunning();
  assert.equal(await rt2.reapExpiredLeases(), 0, 'restarted reaper ignores HOLD rows');
  assert.equal(h.workerInvocations, 1, 'restarted scheduler dispatches nothing');
  assert.ok(!(await rt2.getPending(10)).some(r => r.mission_id === id), 'HOLD invisible to getPending after restart');
  assert.equal(await rt2.assign(id, 'observation'), 0, 'HOLD not claimable after restart');
  assertHoldInvariant(h.pool, id, 'after restart');
});

// ── WITNESS_CREATE: classified before re-execution ──────────────────
test('WITNESS_CREATE with unknown outcome: no re-execution without a proven idempotency contract', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-nr-6', 'WITNESS_CREATE');
  assertHoldInvariant(h.pool, id, 'witness HOLD');
  assert.equal(h.pool.missions.get(id).hold_record.classification, 'UNKNOWN_EXECUTION');

  // Unclassified retry attempt: rejected.
  await assert.rejects(
    h.mr.reconcileHold(id, 'safe_to_retry', { evidence: 'witness worker seemed stuck; retry it' }),
    /proven|idempotency/i,
    'WITNESS_CREATE must be classified before re-execution'
  );
  assertHoldInvariant(h.pool, id, 'after rejected witness reconcile');

  // Classified with a proven contract: allowed, same logical identity.
  const resolved = await h.mr.reconcileHold(id, 'safe_to_retry', {
    evidence: 'witness store queried by witness key; no witness record exists',
    idempotencyContract: { operation: 'witness-create', key: 'wit:evt-nr-6', verified_at: iso() },
  });
  assert.equal(resolved, true);
  assert.equal(h.pool.missions.get(id).logical_operation_id, id);
  assert.equal(h.pool.missions.get(id).outcome, 'SAFE_TO_RETRY');
});

// ── FULL CHAIN, end to end ──────────────────────────────────────────

test('full chain: UNKNOWN -> HOLD -> lease expiry -> reaper distinguishes -> polls -> restart -> reconciliation -> retry eligible only with proof', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });

  // UNKNOWN -> HOLD: one ambiguous dispatch, effect count 1.
  const idU = await dispatchAndHold(h, 'evt-chain-1');
  assertHoldInvariant(h.pool, idU, 'unknown -> hold');
  assert.equal(h.workerInvocations, 1);

  // A sibling mission that was claimed but never started: abandoned,
  // known not to have produced an effect.
  const idA = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-chain-2', event_type: 'LEAD_CREATED' });
  await h.mr.assign(idA, 'observation');
  h.pool.missions.get(idA).lease_until = pastIso(5000);

  // Lease expiry + reaper: adversarial stale lease on the HOLD row too.
  h.pool.missions.get(idU).lease_until = pastIso(5000);
  h.advance(61000);
  assert.equal(await h.mr.reapExpiredLeases(), 1, 'reaper reclaims ONLY the abandoned never-started mission');
  assert.equal(h.pool.missions.get(idA).status, 'created');
  assert.equal(h.pool.missions.get(idA).retry_eligibility, true);
  assertHoldInvariant(h.pool, idU, 'lease expiry never returns the unknown-outcome mission to created');

  // Scheduler polls: the reclaimed sibling dispatches normally; the HOLD
  // mission is never re-dispatched.
  h.setWorker('ok');
  await h.sched._poll();
  assert.equal(h.pool.missions.get(idA).status, 'completed', 'never-started sibling reclaimed and dispatched');
  assert.equal(h.dispatchedMissionIds.filter(x => x === idU).length, 1, 'unknown-outcome mission dispatched exactly once');
  assertHoldInvariant(h.pool, idU, 'after polls');

  // Runtime restart: new scheduler, willing worker, stale lease re-injected
  // on the HOLD row — still non-dispatchable.
  const sched2 = h.restartedScheduler('ok');
  h.pool.missions.get(idU).lease_until = pastIso(5000);
  await sched2._poll();
  await sched2.reconcileStuckRunning();
  assert.equal(h.dispatchedMissionIds.filter(x => x === idU).length, 1, 'restart dispatches nothing');
  assertHoldInvariant(h.pool, idU, 'after restart');

  // Reconciliation with a proven idempotency contract: only now eligible.
  const resolved = await h.mr.reconcileHold(idU, 'safe_to_retry', {
    evidence: 'downstream ledger queried by idempotency key; operation carries a deduping key',
    idempotencyContract: { operation: 'lead-followup-send', key: 'idem:evt-chain-1', verified_at: iso() },
  });
  assert.equal(resolved, true);
  let m = h.pool.missions.get(idU);
  assert.equal(m.status, 'created');
  assert.equal(m.outcome, 'SAFE_TO_RETRY');
  assert.equal(m.retry_eligibility, true);
  assert.equal(m.logical_operation_id, idU, 'same logical operation identity across HOLD, restart, retry');

  // The contracted retry executes exactly once more and completes.
  await sched2._poll();
  m = h.pool.missions.get(idU);
  assert.equal(m.status, 'completed');
  assert.equal(m.outcome, 'SUCCEEDED');
  assert.equal(h.dispatchedMissionIds.filter(x => x === idU).length, 2, 'one ambiguous dispatch + one contracted retry — no more');
  assert.equal(m.logical_operation_id, idU);
});

// ── P0B spec-literal hostile proof ──────────────────────────────────

test('P0B: real effect then destroyed ack -> HOLD -> repeated reaper/polls/restart -> counter and ledger stay 1 -> reconciliation resolves', async () => {
  const h = makeHarness({ worker: 'effectThenHang', dispatchTimeoutMs: 50 });

  // Effect counter starts at 0.
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-p0b-1', event_type: 'LEAD_CREATED', correlation_id: 'corr-evt-p0b-1',
  });
  assert.equal(h.pool.missions.get(id).effect_count, 0, 'counter starts at 0');

  // Worker performs the consequential effect (counter -> 1, real downstream
  // effect recorded), then the acknowledgement is destroyed -> timeout.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll();
  } finally {
    clearInterval(keepAlive);
  }
  assert.equal(h.workerInvocations, 1, 'worker invoked exactly once');
  assert.equal(h.pool.missions.get(id).effect_count, 1, 'counter becomes 1');
  assert.equal(h.effectLedger.get(id), 1, 'the consequential effect really happened once');
  assertHoldInvariant(h.pool, id, 'unknown outcome -> HOLD');

  // Lease expires; scheduler/reaper run repeatedly: counter MUST remain 1,
  // state remains HOLD/UNKNOWN throughout.
  for (let round = 0; round < 4; round++) {
    h.pool.missions.get(id).lease_until = pastIso(5000);
    h.advance(70000);
    assert.equal(await h.mr.reapExpiredLeases(), 0, `reaper run ${round}: reclaims nothing`);
    assert.deepEqual(await h.mr.findOrphanedRunning(), [], `reaper run ${round}: no orphan escalation`);
    await h.sched._poll();
    await h.sched.reconcileStuckRunning();
    assertHoldInvariant(h.pool, id, `reaper round ${round}`);
    assert.equal(h.pool.missions.get(id).effect_count, 1, `counter remains 1 through reaper run ${round}`);
    assert.equal(h.effectLedger.get(id), 1, `downstream effect count remains 1 through reaper run ${round}`);
  }
  assert.equal(h.workerInvocations, 1, 'no redispatch across repeated reaper/scheduler runs');

  // Process restart with a willing worker: still nothing dispatches.
  const sched2 = h.restartedScheduler('ok');
  h.pool.missions.get(id).lease_until = pastIso(5000);
  await sched2._poll();
  await sched2.reconcileStuckRunning();
  assert.equal(h.workerInvocations, 1, 'restart dispatches nothing');
  assert.equal(h.effectLedger.get(id), 1, 'restart produces no second effect');
  assertHoldInvariant(h.pool, id, 'after restart');

  // A timeout alone can never resolve it: the fail gate rejects it.
  const probe = { mission_id: id, mission_type: 'LEAD_FOLLOWUP', payload: '{}', retries: 0 };
  await assert.rejects(sched2._failMission(probe, 'dispatch timeout after 50ms', 'timeout'), /not a proven failure/);
  assertHoldInvariant(h.pool, id, 'timeout never converts UNKNOWN');

  // Reconciliation resolves it: the effect provably happened -> SUCCEEDED,
  // effect count still 1, ledger still 1. No second effect was ever produced.
  const resolved = await h.mr.reconcileHold(id, 'succeeded', {
    evidence: { source: 'downstream-ledger', observed: 'effect present exactly once', at: iso() },
  });
  assert.equal(resolved, true);
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'completed');
  assert.equal(m.outcome, 'SUCCEEDED');
  assert.equal(m.effect_count, 1, 'effect count still 1 — the crashed attempt was the only execution');
  assert.equal(h.effectLedger.get(id), 1, 'downstream shows exactly one effect, ever');
  assert.equal(m.logical_operation_id, id);

  // Terminal: further polls never touch it again.
  h.setWorker('ok');
  await h.sched._poll();
  await sched2._poll();
  assert.equal(h.workerInvocations, 1, 'SUCCEEDED mission is never re-executed');
  assert.equal(h.effectLedger.get(id), 1);
});
