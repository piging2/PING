'use strict';
/**
 * HOLD / REAPER INVARIANT — P0 (CEO continuation wave, 2026-09-24).
 *
 * The highest-risk remaining contradiction: HOLD -> lease expiry -> reaper ->
 * created -> redispatch would undo the unknown-outcome guarantee.
 *
 * Required invariant (CEO spec, verbatim):
 *
 *   logical operation dispatched
 *   -> external outcome ambiguous
 *   -> mission enters HOLD
 *   -> lease expires
 *   -> reaper runs
 *   -> scheduler polls repeatedly
 *   -> process restarts
 *   -> second scheduler appears
 *   -> reconciliation remains inconclusive.
 *
 *   REQUIRED: mission remains non-dispatchable, effect count = 1,
 *   logical_operation_id unchanged, retry eligibility = false,
 *   outcome = UNKNOWN, reconciliation required = true.
 *
 *   THEN: reconciliation proves effect happened -> SUCCEEDED, effect count
 *   still 1.
 *
 *   SEPARATE CASE: reconciliation proves effect never happened ->
 *   SAFE_TO_RETRY, same logical operation identity, next attempt, effect
 *   count eventually 1. TRY HARD TO GET EFFECT #2.
 *
 * Vocabulary law: HOLD is the unknown-effect-outcome state. PARKED is not
 * used (the system has no distinct non-failure waiting state that needs it).
 * Only evidence moves a HOLD to SUCCEEDED / FAILED / SAFE_TO_RETRY /
 * continued HOLD. _failMission is wired ONLY to proven failures: it may never
 * turn timeout, lost acknowledgement, or unknown external outcome into
 * FAILED.
 *
 * Run: node --test mission_hold_reaper.invariant.test.js
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
  const behaviors = {
    throwing: (h) => async () => { h.workerInvocations++; throw new Error('worker boom'); },
    hanging: (h) => () => { h.workerInvocations++; return new Promise(() => {}); },
    ok: (h) => async () => { h.workerInvocations++; return { status: 'ok' }; },
    failedStatus: (h) => async () => { h.workerInvocations++; return { status: 'failed', error: 'worker observed its own failure' }; },
    nullDispatch: (h) => async () => { h.workerInvocations++; return null; },
  };
  const harness = {
    pool, events: eventRuntime, workerInvocations: 0,
    dlqRecords: [], _behavior: opts.worker || 'hanging',
  };
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    dispatch: (...a) => {
      if (a[0] && a[0].mission_id) harness.dispatchedMissionIds.push(a[0].mission_id);
      return behaviors[harness._behavior](harness)(...a);
    },
  };
  harness.dispatchedMissionIds = [];
  harness.workerRuntime = workerRuntime;
  harness.setWorker = (b) => { harness._behavior = b; };
  const deadLetterAuthority = {
    async recordDeadLetter(job, error) {
      harness.dlqRecords.push({ job, error: String((error && error.message) || error) });
    },
  };
  const mr = new MissionRuntime({ pool, eventRuntime });
  const sched = new MissionScheduler({
    missionRuntime: mr,
    workerRuntime,
    eventRuntime,
    deadLetterAuthority,
    retryPolicy: opts.retryPolicy || { max_attempts: 3, backoff_delay_ms: 5000 },
    pollIntervalMs: 3600000,
    dispatchTimeoutMs: opts.dispatchTimeoutMs,
    stuckThresholdMs: opts.stuckThresholdMs,
  });
  harness.mr = mr;
  harness.sched = sched;
  harness.advance = (ms) => { fakeNow += ms; };
  harness.now = () => fakeNow;
  // "Process restart": brand-new scheduler + runtime over the same pool and
  // event bus, with fresh in-memory _processing/_reconciled sets.
  harness.restartedScheduler = (workerBehavior) => {
    const rt = new MissionRuntime({ pool, eventRuntime });
    const wr = {
      getStats: () => ({ workers: { observation: {} } }),
      dispatch: (...a) => behaviors[workerBehavior || harness._behavior](harness)(...a),
    };
    return new MissionScheduler({
      missionRuntime: rt, workerRuntime: wr, eventRuntime,
      deadLetterAuthority,
      retryPolicy: opts.retryPolicy || { max_attempts: 3, backoff_delay_ms: 5000 },
      pollIntervalMs: 3600000,
      dispatchTimeoutMs: opts.dispatchTimeoutMs,
      stuckThresholdMs: opts.stuckThresholdMs,
    });
  };
  return harness;
}

function holdsOf(h) {
  return h.events.emitted.filter(e => e.type === 'MISSION_RECONCILE_HOLD');
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
async function dispatchAndHold(h, eventId) {
  const id = await h.mr.create('LEAD_FOLLOWUP', {
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

// ── THE INVARIANT ───────────────────────────────────────────────────

test('HOLD invariant: lease expiry + reaper + polls + restart + second scheduler cannot redispatch', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-hold-1');

  // 1. Mission entered HOLD with the full observable state.
  assertHoldInvariant(h.pool, id, 'after dispatch timeout');
  const m0 = h.pool.missions.get(id);
  assert.ok(m0.hold_record, 'HOLD record carried on the row');
  assert.equal(m0.hold_record.classification, 'UNKNOWN_EXECUTION');
  assert.equal(h.workerInvocations, 1, 'exactly one dispatch attempted');
  assert.equal(holdsOf(h).length, 1, 'exactly one HOLD reconciliation emitted');
  assert.equal(holdsOf(h)[0].payload.record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');

  // 2. Lease expiry + reaper: TRY HARD — even with a stale lease injected on
  //    the HOLD row, the reaper cannot make it retryable.
  h.pool.missions.get(id).lease_until = pastIso(5000);
  h.advance(120000);
  assert.equal(await h.mr.reapExpiredLeases(), 0, 'reaper reclaims zero HOLD missions');
  assertHoldInvariant(h.pool, id, 'after lease expiry + reaper');

  // 3. Scheduler polls repeatedly: no redispatch, no state drift.
  for (let i = 0; i < 5; i++) await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'no second dispatch across repeated polls');
  assertHoldInvariant(h.pool, id, 'after repeated polls');

  // 4. Adversarial direct attempts against the row.
  assert.ok(!(await h.mr.getPending(10)).some(r => r.mission_id === id), 'HOLD invisible to getPending');
  assert.equal(await h.mr.assign(id, 'observation'), 0, 'HOLD not claimable by the conditional claim');
  assert.equal(await h.mr.reclaimRetryPending(), 0, 'no retry re-entry for a HOLD');
  assert.deepEqual(await h.mr.findOrphanedRunning(), [], 'HOLD excluded from orphan escalation');
  await h.mr.fail(id, 'adversarial fail');
  await h.mr.complete(id, {});
  assertHoldInvariant(h.pool, id, 'after adversarial fail/complete attempts');
  assert.equal((await h.mr.getHolds()).length, 1, 'HOLD visible in the reconciliation backlog');

  // 5. Process restart: brand-new scheduler over the same pool, with a
  //    WILLING worker — reconciliation still inconclusive.
  const sched2 = h.restartedScheduler('ok');
  await sched2._poll();
  await sched2.reconcileStuckRunning();
  assert.equal(h.workerInvocations, 1, 'restarted scheduler dispatches nothing');
  assertHoldInvariant(h.pool, id, 'after process restart');

  // 6. A second scheduler appears concurrently.
  const sched3 = h.restartedScheduler('ok');
  await sched3._poll();
  await sched2._poll();
  assert.equal(h.workerInvocations, 1, 'second scheduler dispatches nothing');
  assertHoldInvariant(h.pool, id, 'with two schedulers polling');
});

test('reconciliation: proven effect happened -> SUCCEEDED, effect count still 1', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-hold-2');
  assertHoldInvariant(h.pool, id, 'before reconciliation');

  const resolved = await h.mr.reconcileHold(id, 'succeeded', {
    evidence: { source: 'downstream-ledger', observed: 'effect present', at: iso() },
  });
  assert.equal(resolved, true);
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'completed');
  assert.equal(m.outcome, 'SUCCEEDED');
  assert.equal(m.effect_count, 1, 'effect count still 1 — no second execution');
  assert.equal(m.logical_operation_id, id);
  assert.equal(m.reconciliation_required, false);
  assert.equal(m.retry_eligibility, false);
  const ev = h.events.emitted.filter(e => e.type === 'MISSION_HOLD_RESOLVED');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].payload.decision, 'succeeded');

  // Terminal: further polls never touch it again.
  h.setWorker('ok');
  await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'SUCCEEDED mission is never re-executed');
  assert.equal(h.pool.missions.get(id).effect_count, 1);
});

test('reconciliation: proven effect never happened -> SAFE_TO_RETRY -> next attempt -> effect count eventually 1', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-hold-3');
  assertHoldInvariant(h.pool, id, 'before reconciliation');

  const resolved = await h.mr.reconcileHold(id, 'safe_to_retry', {
    evidence: 'downstream ledger has no trace of the effect; reconciler verified absence',
    effectProvenAbsent: true,
  });
  assert.equal(resolved, true);
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'created');
  assert.equal(m.outcome, 'SAFE_TO_RETRY');
  assert.equal(m.retry_eligibility, true);
  assert.equal(m.reconciliation_required, false);
  assert.equal(m.effect_count, 0, 'proven non-occurrence corrects the conservative count');
  assert.equal(m.logical_operation_id, id, 'same logical operation identity');
  assert.equal(m.retries, 0, 'attempt counting preserved (F-01)');

  // Next attempt with a healthy worker: exactly one real effect.
  h.setWorker('ok');
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'completed');
  assert.equal(m.outcome, 'SUCCEEDED');
  assert.equal(m.effect_count, 1, 'effect count eventually 1');
  assert.equal(m.logical_operation_id, id);
  assert.equal(h.workerInvocations, 2, 'one ambiguous dispatch + one real attempt — no more');
});

test('reconcileHold vocabulary: only SUCCEEDED / FAILED / SAFE_TO_RETRY / continued HOLD exits exist', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await dispatchAndHold(h, 'evt-hold-4');

  await assert.rejects(h.mr.reconcileHold(id, 'retry'), /unknown decision/, 'no synonyms for the states');
  await assert.rejects(h.mr.reconcileHold(id, 'bogus'), /unknown decision/);
  await assert.rejects(h.mr.reconcileHold(id, 'succeeded', {}), /evidence/i, 'SUCCEEDED requires evidence');
  await assert.rejects(h.mr.reconcileHold(id, 'failed', {}), /evidence/i, 'FAILED requires evidence');
  await assert.rejects(h.mr.reconcileHold(id, 'safe_to_retry', {}), /evidence/i, 'SAFE_TO_RETRY requires evidence');
  assertHoldInvariant(h.pool, id, 'rejected resolutions change nothing');

  // Continued HOLD: still inconclusive, still owned by reconciliation.
  const cont = await h.mr.reconcileHold(id, 'hold', { note: 'downstream ledger still unreachable' });
  assert.equal(cont, true);
  assertHoldInvariant(h.pool, id, 'continued HOLD');
  const m = h.pool.missions.get(id);
  assert.match(JSON.stringify(m.hold_record), /still unreachable/);

  // FAILED on proven-failure evidence (never on timeout).
  const f = await h.mr.reconcileHold(id, 'failed', {
    evidence: 'downstream confirms the operation was rejected before any effect could occur',
  });
  assert.equal(f, true);
  const mf = h.pool.missions.get(id);
  assert.equal(mf.status, 'failed');
  assert.equal(mf.outcome, 'FAILED');
  assert.equal(mf.reconciliation_required, false);
  assert.equal(mf.effect_count, 1);
});

// ── _failMission WIRING ─────────────────────────────────────────────

test('_failMission is wired ONLY to proven failures; unknown outcomes HOLD', async () => {
  const h = makeHarness({ worker: 'failedStatus', retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 } });

  // (a) Worker returned a failure status: its own observed failure -> fail path.
  const id1 = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-fm-1', event_type: 'LEAD_CREATED' });
  await h.sched._poll();
  let m = h.pool.missions.get(id1);
  assert.equal(m.status, 'retry_pending', 'proven failure enters bounded retry');
  assert.ok(h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'MISSION_FAILED emitted');
  const derived = h.events.emitted.filter(e => e.type === 'MISSION_FAILURE_DERIVED');
  assert.equal(derived.length, 1, 'proven outcome derivation wired as evidence');
  assert.equal(derived[0].payload.record.classification, 'TEMPORARY_FAILURE',
    'mechanical classification for a non-exhausted worker failure');
  assert.equal(holdsOf(h).length, 0, 'no HOLD from the proven-failure path');

  // (b) Worker THREW: effect unknown -> HOLD, never _failMission.
  h.setWorker('throwing');
  const id2 = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-fm-2', event_type: 'LEAD_CREATED' });
  await h.sched._poll();
  assertHoldInvariant(h.pool, id2, 'thrown dispatch holds');
  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_FAILED' && e.payload.missionId === id2),
    'a dispatch throw never becomes MISSION_FAILED');

  // (c) No worker matched: dispatch never invoked, effect provably absent -> fail path.
  h.setWorker('nullDispatch');
  const id3 = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-fm-3', event_type: 'LEAD_CREATED' });
  await h.sched._poll();
  m = h.pool.missions.get(id3);
  assert.equal(m.status, 'retry_pending', 'no-worker is a proven non-dispatch');
  const derived3 = h.events.emitted.filter(e =>
    e.type === 'MISSION_FAILURE_DERIVED' && e.payload.record.evidence.mission_id === id3);
  assert.equal(derived3.length, 1);
  assert.equal(derived3[0].payload.record.classification, 'ELIGIBILITY_EMPTY');

  // (d) The guard: unknown outcomes are rejected at the _failMission boundary.
  const probe = { mission_id: id1, mission_type: 'LEAD_FOLLOWUP', payload: '{}', retries: 0, assigned_to: 'observation' };
  await assert.rejects(h.sched._failMission(probe, 'boom', 'worker_threw'), /not a proven failure/);
  await assert.rejects(h.sched._failMission(probe, 'boom', 'unknown'), /not a proven failure/);
  await assert.rejects(h.sched._failMission(probe, 'boom', 'ok'), /not a proven failure/);
});

// ── REAPER NARROWING ────────────────────────────────────────────────

test('reaper reclaims only abandoned-never-started missions; orphaned running escalate to HOLD', async () => {
  const h = makeHarness({ worker: 'ok' });

  const idA = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-rp-1', event_type: 'LEAD_CREATED' });
  await h.mr.assign(idA, 'observation'); // never started: worker never invoked
  h.pool.missions.get(idA).lease_until = pastIso(5000);

  const idB = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-rp-2', event_type: 'LEAD_CREATED' });
  await h.mr.assign(idB, 'observation');
  await h.mr.start(idB); // started: effect unknown
  // The (simulated crashed) scheduler did dispatch the worker once.
  if (typeof h.mr.recordDispatchAttempt === 'function') await h.mr.recordDispatchAttempt(idB);
  h.pool.missions.get(idB).lease_until = pastIso(5000);

  h.advance(61000);
  assert.equal(await h.mr.reapExpiredLeases(), 1, 'only the never-started mission is reaped');
  assert.equal(h.pool.missions.get(idA).status, 'created');
  assert.equal(h.pool.missions.get(idA).retry_eligibility, true);
  assert.equal(h.pool.missions.get(idB).status, 'running', 'lease expiry never returns running to created');

  // The scheduler's orphan-escalation arrow parks it as HOLD — never re-dispatches.
  // (idA was legitimately reaped to created and is dispatched here by the ok
  // worker; the assertion that matters is idB.)
  await h.sched._poll();
  assert.equal(h.pool.missions.get(idB).status, 'hold');
  assert.ok(!h.dispatchedMissionIds.includes(idB), 'orphaned running mission is never re-dispatched');
  assert.ok(h.dispatchedMissionIds.includes(idA), 'never-started mission reclaimed and dispatched normally');
  assertHoldInvariant(h.pool, idB, 'orphan escalation');
});
