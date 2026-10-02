'use strict';
/**
 * MC H5 HOLD TIMEOUT LIVE-FIRE (2026-09-27).
 *
 * Live-fires the timeout->UNKNOWN semantics on the REAL Mission Control
 * dispatch lane (f01-fix/mission_scheduler.js + mission_runtime.js +
 * failure_record.js). The ORCA audit (2026-09-24) proved these in bounded
 * synthetics; this run proves them live on the MC lane:
 *
 *   a dispatch that times out must resolve to OUTCOME_UNKNOWN, land in the
 *   blocked set (status='hold', outcome='UNKNOWN', retry_eligibility=FALSE,
 *   reconciliation_required=TRUE) with a MISSION_RECONCILE_HOLD event, and
 *   trigger zero re-dispatch.
 *
 * Live elements (genuinely exercised, not stubbed):
 *   - the real scheduler poll loop (start()/stop(), setInterval)
 *   - the real dispatch timeout race: a hanging worker vs a real setTimeout
 *     in _dispatchWithTimeout (dispatchTimeoutMs=300ms)
 *   - the real _reconcileUnknown -> deriveFailureRecord -> parkHold ->
 *     MISSION_RECONCILE_HOLD emit path
 *   - the real poll arrows (reaper, orphan escalation, stuck watchdog) run
 *     alongside and must NOT touch the held mission
 *
 * Bounded elements (no external effects):
 *   - FakePool from the ORCA-audit harness (fake pg.Pool; honest: only
 *     SQL-encoded behavior is faked)
 *   - worker returns a never-settling promise (forced timeout); it performs
 *     no effect at all
 *   - in-memory event capture runtime
 *
 * Run: node --test mc-timeout-unknown-livefire.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { MissionRuntime } = require('/home/hatch/workspace/f01-fix/mission_runtime.js');
const { MissionScheduler } = require('/home/hatch/workspace/f01-fix/mission_scheduler.js');
const { FakePool } = require('/home/hatch/workspace/f01-fix/fake_mission_pool.js');

test('MC H5 HOLD live-fire: forced dispatch timeout -> OUTCOME_UNKNOWN + blocked set + MISSION_RECONCILE_HOLD + zero re-dispatch', async (t) => {
  const pool = new FakePool(); // real clock — the timeout race is genuinely live
  const emitted = [];
  const eventRuntime = {
    emitted,
    async emit(type, source, payload = {}) {
      emitted.push({ type, source, payload });
      return { status: 'ok' };
    },
  };
  let workerInvocations = 0;
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    // Forced-timeout worker: invoked exactly like a real worker would be, but
    // never settles and performs zero external effect. The dispatch timer must
    // win the real race in _dispatchWithTimeout.
    dispatch: async (event) => {
      workerInvocations++;
      return new Promise(() => {});
    },
  };
  const runtime = new MissionRuntime({ pool, eventRuntime });
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime,
    eventRuntime,
    pollIntervalMs: 400,
    dispatchTimeoutMs: 300, // short bound; the timer wins this race for real
    stuckThresholdMs: 60000,
  });

  const missionId = await runtime.create('SYSTEM_HEALTH_CHECK', {
    event_id: 'mc-livefire-' + Date.now(),
    event_type: 'SYSTEM_HEALTH_CHECK',
    correlation_id: 'mc-livefire',
  });

  scheduler.start();
  // 4000ms: initial poll dispatches immediately, 300ms timeout fires,
  // _reconcileUnknown parks the HOLD, then ~8 more real poll cycles run
  // (reaper + orphan escalation + stuck watchdog + getPending) to prove
  // the held mission is never re-dispatched.
  await new Promise((r) => setTimeout(r, 4000));
  scheduler.stop();
  // Let any in-flight _reconcileUnknown settle after stop.
  await new Promise((r) => setTimeout(r, 500));

  const types = (ty) => emitted.filter((e) => e.type === ty);

  // ── (1) OUTCOME_UNKNOWN recorded ──────────────────────────────────
  const holds = types('MISSION_RECONCILE_HOLD');
  assert.equal(holds.length, 1, `expected exactly 1 MISSION_RECONCILE_HOLD, got ${holds.length}`);
  const record = holds[0].payload.record;
  assert.equal(record.evidence.mission_id, missionId, 'HOLD record names the timed-out mission');
  assert.equal(record.status, 'HOLD_RECONCILE', 'record status');
  assert.equal(record.outcome, 'unknown_hold', 'record outcome (OUTCOME_UNKNOWN)');
  assert.equal(record.classification, 'UNKNOWN_EXECUTION', 'record classification');
  assert.equal(
    record.display,
    'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS',
    'record display literal'
  );
  assert.equal(record.replay.dispatch_outcome, 'unknown', 'dispatch outcome was unknown');
  assert.equal(
    record.self_heal,
    'none: held for reconciliation; no automatic retry (retry safety unproven for unknown effects)',
    'no automatic retry derived'
  );

  // ── (2) blocked set: mission row parked as hold ───────────────────
  const row = pool.missions.get(missionId);
  assert.ok(row, 'mission row exists');
  assert.equal(row.status, 'hold', 'row parked in blocked set (status=hold)');
  assert.equal(row.outcome, 'UNKNOWN', 'row outcome literal UNKNOWN');
  assert.equal(row.retry_eligibility, false, 'retry_eligibility=FALSE (scheduler cannot claim)');
  assert.equal(row.reconciliation_required, true, 'reconciliation_required=TRUE');
  assert.equal(row.lease_until, null, 'lease cleared');
  assert.equal(row.effect_count, 1, 'exactly one dispatch attempt counted (no effect, no second attempt)');
  const parked = typeof row.hold_record === 'string' ? JSON.parse(row.hold_record) : row.hold_record;
  assert.equal(parked.classification, 'UNKNOWN_EXECUTION', 'parked hold_record classification');

  // ── (3) MISSION_RECONCILE_HOLD event emitted ─────────────────────
  assert.equal(holds[0].source, 'mission-scheduler', 'event source');
  assert.equal(holds[0].payload.missionId, missionId, 'event names the mission');

  // ── (4) zero re-dispatch ──────────────────────────────────────────
  assert.equal(workerInvocations, 1, `worker invoked exactly once, got ${workerInvocations}`);
  const pending = await runtime.getPending(10);
  assert.ok(
    !pending.some((m) => m.mission_id === missionId),
    'held mission never re-enters getPending'
  );
  // The mission is never terminal-failed and never failure-derived: a timeout
  // never resolves to FAILED.
  assert.equal(types('MISSION_FAILURE_DERIVED').length, 0, 'no MISSION_FAILURE_DERIVED on timeout');
  assert.equal(row.status, 'hold', 'still hold at end (no collapse to created/failed)');

  console.log(
    `[live-fire] PASS mission=${missionId} invocations=${workerInvocations} ` +
      `hold_events=${holds.length} outcome=${row.outcome} status=${row.status}`
  );
});
