'use strict';
/**
 * Regression tests — F-01 bounded retry repair + stuck-running watchdog.
 *
 * F-01 (reproduced against pristine HEAD in /tmp/f01-repro.js): a mission
 * whose worker threw entered retry_pending, and every subsequent poll
 * re-dispatched it to the worker with ZERO state progress — retries frozen
 * at 1, exhaustion unreachable, infinite identical re-execution. Root cause
 * chain:
 *   1. getPending() returned due retry_pending rows directly;
 *   2. _dispatch() ignored assign()'s rowCount, so the P0-1 conditional claim
 *      never gated dispatch (assign/start silently no-opped on the row);
 *   3. failWithRetry()'s retry-branch UPDATE matched only
 *      status IN ('running','assigned'), so a failure recorded against an
 *      already-retry_pending row updated zero rows — the counter never moved.
 *
 * These tests prove the repaired behavior: retries make state progress
 * (attempt counting, backoff gates, terminal exhaustion), dispatch is
 * claim-gated, dispatch timeouts and stuck-running missions are parked as
 * durable HOLD (never FAILED), and the fail path — wired ONLY to proven
 * failures — emits deriveFailureRecord as evidence (MISSION_FAILURE_DERIVED),
 * never HOLD records.
 *
 * Provenance note: a worker that THREW is an ambiguous effect, not a proven
 * failure — the fail/retry path is exercised with a worker that RETURNS a
 * failure status ('failedStatus' behavior), never a throwing one.
 *
 * Run: node --test mission_scheduler.retry_watchdog.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { MissionRuntime } = require('./mission_runtime.js');
const { MissionScheduler } = require('./mission_scheduler.js');
const { FakePool } = require('./fake_mission_pool.js');

// ── Controllable clock ──────────────────────────────────────────────
// Both the fake pool's NOW() and the runtime's Date.now() (retry_at,
// started_at, ...) follow this clock. It is reset for every harness so
// time advances in one test never leak into the next.
let fakeNow = Date.now();
const realDateNow = Date.now;
Date.now = () => fakeNow;
const iso = () => new Date(fakeNow).toISOString();

function makeHarness(opts = {}) {
  fakeNow = realDateNow(); // fresh clock per harness — no cross-test leakage
  const pool = new FakePool({ now: () => fakeNow });
  const emitted = [];
  const eventRuntime = {
    emitted,
    async emit(type, source, payload = {}) { emitted.push({ type, source, payload }); return { status: 'ok' }; },
  };
  const harness = { pool, events: eventRuntime, workerInvocations: 0, dlqRecords: [] };
  const behaviors = {
    // throwing: effect AMBIGUOUS (the worker may have produced the effect
    // before throwing) -> HOLD for reconciliation, never the fail path.
    throwing: async () => { harness.workerInvocations++; throw new Error('worker boom'); },
    hanging: () => { harness.workerInvocations++; return new Promise(() => {}); },
    ok: async () => { harness.workerInvocations++; return { status: 'ok' }; },
    // failedStatus: PROVEN failure (the worker ran and reported failure) ->
    // the bounded fail/retry path.
    failedStatus: async () => { harness.workerInvocations++; return { status: 'failed', error: 'worker observed its own failure' }; },
  };
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    dispatch: behaviors[opts.worker || 'throwing'],
  };
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
    pollIntervalMs: 3600000, // manual _poll() only
    dispatchTimeoutMs: opts.dispatchTimeoutMs,
    stuckThresholdMs: opts.stuckThresholdMs,
  });
  harness.mr = mr;
  harness.sched = sched;
  harness.advance = (ms) => { fakeNow += ms; };
  harness.now = () => fakeNow;
  return harness;
}

function holds(h) {
  return h.events.emitted.filter(e => e.type === 'MISSION_RECONCILE_HOLD');
}

// ── F-01: bounded retry ─────────────────────────────────────────────

test('F-01: retries make state progress — counted attempts, backoff gates, terminal exhaustion', async () => {
  // Proven failure (worker ran and reported failure) — the bounded
  // fail/retry path. A THROWING worker is an ambiguous effect and goes to
  // HOLD, never here.
  const h = makeHarness({ worker: 'failedStatus', retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 } });
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t1', event_type: 'LEAD_CREATED', correlation_id: 'corr-t1',
  });

  // Attempt 1: created -> assigned -> running -> worker reports failure -> retry_pending
  await h.sched._poll();
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 1);
  assert.equal(h.workerInvocations, 1);

  // Backoff gate holds: a poll before retry_at does NOT re-dispatch
  await h.sched._poll();
  assert.equal(h.workerInvocations, 1, 'no re-dispatch before the backoff gate elapses');
  assert.equal(h.pool.missions.get(id).status, 'retry_pending');

  // Attempt 2 (past backoff): reclaim -> created -> claim -> dispatch -> worker reports failure
  h.advance(6000);
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 2, 'attempt counter advanced — state progress');
  assert.equal(h.workerInvocations, 2);

  // Attempt 3 (past backoff): exhaustion -> failed + DLQ
  h.advance(6000);
  await h.sched._poll();
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'failed', 'terminal state reached');
  assert.equal(m.retries, 3);
  assert.equal(h.workerInvocations, 3, 'worker invoked exactly once per attempt — no infinite re-execution');
  assert.equal(h.dlqRecords.length, 1);
  assert.equal(h.dlqRecords[0].job.job_id, id);

  // Terminal: further polls never touch it again
  h.advance(60000);
  await h.sched._poll();
  assert.equal(h.workerInvocations, 3);
  assert.equal(h.pool.missions.get(id).status, 'failed');

  // Re-entry was observable: one MISSION_RETRY_RECLAIMED per reclaimed attempt
  const reclaims = h.events.emitted.filter(e => e.type === 'MISSION_RETRY_RECLAIMED');
  assert.equal(reclaims.length, 2);
});

test('F-01: _dispatch never invokes the worker for a non-claimable row', async () => {
  const h = makeHarness({ worker: 'throwing' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t2', event_type: 'LEAD_CREATED' });
  // A concurrent scheduler wins the claim first; this scheduler holds a stale snapshot.
  assert.equal(await h.mr.assign(id, 'other-scheduler'), 1);
  const staleRow = {
    mission_id: id, mission_type: 'LEAD_FOLLOWUP', status: 'created',
    payload: JSON.stringify({ event_id: 'evt-t2', event_type: 'LEAD_CREATED' }),
    priority: 0, created_at: iso(),
  };
  await h.sched._dispatch(staleRow);
  assert.equal(h.workerInvocations, 0, 'worker must not run when the claim guard rejects the row');
  assert.equal(h.sched.getStats().skipped, 1);
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'assigned');
  assert.equal(m.assigned_to, 'other-scheduler');
});

test('F-01: failWithRetry on an already-retry_pending row advances the counter (no silent no-op)', async () => {
  const h = makeHarness({ worker: 'throwing' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t7', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  await h.mr.start(id);
  await h.mr.failWithRetry(id, 'boom', { max_attempts: 5, backoff_delay_ms: 5000 });
  // A second failure recorded directly against the retry_pending row (the old F-01 shape)
  const next = await h.mr.failWithRetry(id, 'boom again', { max_attempts: 5, backoff_delay_ms: 5000 });
  assert.equal(next, 2);
  const m = h.pool.missions.get(id);
  assert.equal(m.retries, 2, 'every failure makes state progress');
  assert.equal(m.status, 'retry_pending');
});

test('reclaimRetryPending: backoff-gated re-entry, attempt counting preserved', async () => {
  const h = makeHarness({ worker: 'throwing', retryPolicy: { max_attempts: 5, backoff_delay_ms: 5000 } });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t6', event_type: 'LEAD_CREATED' });
  await h.mr.assign(id, 'observation');
  await h.mr.start(id);
  await h.mr.failWithRetry(id, 'boom', { max_attempts: 5, backoff_delay_ms: 5000 });
  let m = h.pool.missions.get(id);
  assert.equal(m.status, 'retry_pending');
  assert.equal(m.retries, 1);

  assert.equal(await h.mr.reclaimRetryPending(), 0, 'nothing reclaimed before the backoff gate');
  assert.equal(h.pool.missions.get(id).status, 'retry_pending');

  h.advance(6000);
  assert.equal(await h.mr.reclaimRetryPending(), 1);
  m = h.pool.missions.get(id);
  assert.equal(m.status, 'created');
  assert.equal(m.retries, 1, 'attempt counting persists across reclaims');
  assert.equal(m.retry_at, null);
  assert.equal(h.events.emitted.filter(e => e.type === 'MISSION_RETRY_RECLAIMED').length, 1);
});

// ── Watchdog ────────────────────────────────────────────────────────

test('watchdog: dispatch timeout emits HOLD reconciliation — never FAILED', async () => {
  const h = makeHarness({ worker: 'hanging', dispatchTimeoutMs: 50 });
  const id = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t3', event_type: 'LEAD_CREATED', correlation_id: 'corr-t3',
  });

  // The dispatch timeout uses an unref'd timer (it must never hold the
  // process open in production). Keep a ref'd handle alive for the test so
  // the event loop survives until the timer fires.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await h.sched._poll(); // dispatch hangs -> 50ms timeout -> HOLD
  } finally {
    clearInterval(keepAlive);
  }

  const m = h.pool.missions.get(id);
  // The timeout is parked as durable HOLD: row truthfully mutated, never FAILED.
  assert.equal(m.status, 'hold', 'timeout parks the mission as HOLD');
  assert.equal(m.outcome, 'UNKNOWN');
  assert.equal(m.retry_eligibility, false, 'HOLD is non-dispatchable');
  assert.equal(m.reconciliation_required, true, 'reconciliation owns the next transition');
  assert.equal(m.effect_count, 1, 'the invocation may have produced the effect');
  assert.equal(m.retries, 0, 'no retry scheduled for an unknown outcome');

  const hs = holds(h);
  assert.equal(hs.length, 1, 'exactly one reconciliation record emitted');
  const record = hs[0].payload.record;
  assert.equal(hs[0].payload.missionId, id);
  assert.equal(record.status, 'HOLD_RECONCILE');
  assert.equal(record.outcome, 'unknown_hold');
  assert.equal(record.classification, 'UNKNOWN_EXECUTION');
  assert.equal(record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.match(record.failure_id, /^fl-[0-9a-f]{12}$/);
  assert.equal(record.evidence.mission_id, id);
  assert.ok(record.replay.correlation_id, 'replay carries correlation identity');

  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'no MISSION_FAILED on timeout');
  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_RETRY_RECLAIMED'), 'no retry re-entry on timeout');

  const log = h.sched.getReconciliationLog();
  assert.equal(log.length, 1);
  assert.equal(log[0].mission_id, id);
  assert.equal(log[0].record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  assert.equal(h.sched.getStats().reconciled, 1);
});

test('watchdog: stuck-running scan reconciles old missions once; skips fresh and in-processing ones', async () => {
  const h = makeHarness({ worker: 'ok', stuckThresholdMs: 600000 });

  const oldId = await h.mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-t4a', event_type: 'LEAD_CREATED', correlation_id: 'corr-t4a',
  });
  await h.mr.assign(oldId, 'observation');
  await h.mr.start(oldId);
  h.pool.missions.get(oldId).started_at = new Date(h.now() - 20 * 60000).toISOString();

  const freshId = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t4b', event_type: 'LEAD_CREATED' });
  await h.mr.assign(freshId, 'observation');
  await h.mr.start(freshId);

  const n = await h.sched.reconcileStuckRunning();
  assert.equal(n, 1, 'only the old mission is reconciled');
  const hs = holds(h);
  assert.equal(hs.length, 1);
  assert.equal(hs[0].payload.missionId, oldId);
  assert.equal(hs[0].payload.record.display, 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS');
  // Durable HOLD: the row IS parked (non-dispatchable, awaiting reconciliation).
  const parked = h.pool.missions.get(oldId);
  assert.equal(parked.status, 'hold', 'scan parks the row as HOLD');
  assert.equal(parked.outcome, 'UNKNOWN');
  assert.equal(parked.retry_eligibility, false);
  assert.equal(parked.reconciliation_required, true);
  assert.equal(h.sched.getStats().watchdogScans, 1);

  // Dedupe: a second scan emits nothing new for the same mission
  assert.equal(await h.sched.reconcileStuckRunning(), 0);
  assert.equal(holds(h).length, 1);

  // Missions the scheduler is actively processing are skipped even when old
  const procId = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t4c', event_type: 'LEAD_CREATED' });
  await h.mr.assign(procId, 'observation');
  await h.mr.start(procId);
  h.pool.missions.get(procId).started_at = new Date(h.now() - 30 * 60000).toISOString();
  h.sched._processing.add(procId);
  try {
    assert.equal(await h.sched.reconcileStuckRunning(), 0, 'in-processing missions are owned by lease renewal, not the watchdog');
  } finally {
    h.sched._processing.delete(procId);
  }
  assert.equal(holds(h).length, 1);
});

// ── Boundary: fail path wiring (F-01 close-out) ─────────────────────

test('boundary: the fail path emits derived failure records as evidence, never HOLD records', async () => {
  // Proven failure (worker ran and reported failure) — the ONLY shape that
  // enters the fail path.
  const h = makeHarness({ worker: 'failedStatus' });
  await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t5', event_type: 'LEAD_CREATED' });
  await h.sched._poll();
  assert.ok(h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'normal failures still emit MISSION_FAILED');
  // F-01 close-out: the proven outcome derivation is wired in as EVIDENCE
  // only — it never changes the retry/exhaustion/DLQ decision.
  const derived = h.events.emitted.filter(e => e.type === 'MISSION_FAILURE_DERIVED');
  assert.equal(derived.length, 1, 'proven failure derives an evidence record');
  assert.equal(derived[0].payload.record.classification, 'TEMPORARY_FAILURE');
  assert.equal(holds(h).length, 0, 'no HOLD from the fail path');
  assert.equal(h.sched.getReconciliationLog().length, 0);
});

test('boundary: an ambiguous dispatch throw goes to HOLD, never the fail path', async () => {
  const h = makeHarness({ worker: 'throwing' });
  const id = await h.mr.create('LEAD_FOLLOWUP', { event_id: 'evt-t5b', event_type: 'LEAD_CREATED' });
  await h.sched._poll();
  const m = h.pool.missions.get(id);
  assert.equal(m.status, 'hold', 'dispatch throw parks HOLD (ambiguous effects)');
  assert.equal(m.outcome, 'UNKNOWN');
  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_FAILED'), 'a throw never becomes MISSION_FAILED');
  assert.ok(!h.events.emitted.some(e => e.type === 'MISSION_FAILURE_DERIVED'), 'no derived failure record for an unknown outcome');
  assert.equal(holds(h).length, 1);
});
