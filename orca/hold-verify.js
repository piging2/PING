'use strict';
// hold-verify.js - behavioral verification of the staged-rollout HOLD.
// Default MissionScheduler -> legacy direct workerRuntime.dispatch, no
// EFFECT_DISPATCHED, no executor path. unknownOutcomeDispatch:true ->
// executor race path (EFFECT_DISPATCHED emitted), legacy direct path untouched.
// Fakes modeled on gateway/test_unknown_outcome_port.js. No em dashes.
const assert = require('assert');
const crypto = require('crypto');
const { MissionScheduler } = require('/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js');

class FakeWorkerRuntime {
  constructor() { this.dispatchCount = 0; }
  getStats() { return { workers: { observation: { status: 'idle' } } }; }
  async dispatch(event) { this.dispatchCount++; return { status: 'ok' }; }
}
class FakeMissionRuntime {
  constructor() { this.missions = new Map(); }
  seed(m) { this.missions.set(m.mission_id, { status: 'created', retries: 0, ...m }); }
  async assign(id) { const m = this.missions.get(id); if (m) m.status = 'assigned'; return 1; }
  async start(id) { const m = this.missions.get(id); if (m) m.status = 'running'; }
  async complete(id, result) { const m = this.missions.get(id); if (m && m.status === 'running') { m.status = 'completed'; m.result = result; } }
  async hold(id) { const m = this.missions.get(id); if (m) m.status = 'held'; return 1; }
  async resumeHeld(id) { const m = this.missions.get(id); if (m && m.status === 'held') m.status = 'created'; return 1; }
  async fail(id, e) { const m = this.missions.get(id); if (m) { m.status = 'failed'; m.error = e; } }
  async failWithRetry(id, e, policy = {}) { const m = this.missions.get(id); if (m) { m.retries = (m.retries || 0) + 1; m.status = m.retries >= (policy.max_attempts || 3) ? 'failed' : 'retry_pending'; } return m ? m.retries : 0; }
  async getPending() { return [...this.missions.values()].filter((m) => m.status === 'created'); }
  async renewLease() { return 0; }
  async reapExpiredLeases() { return 0; }
}
class FakeEventRuntime {
  constructor() { this.events = []; }
  async emit(eventType, source, payload, options = {}) {
    const eventId = crypto.createHash('sha256').update(JSON.stringify({ eventType, source, logical_id: options.logical_id || null }) + Math.random(), 'utf8').digest('hex');
    this.events.push({ event_id: eventId, event_type: eventType, payload, logical_id: options.logical_id || null });
    return { status: 'ok', eventId };
  }
  emittedOf(t) { return this.events.filter((e) => e.event_type === t); }
}
class MockPool {
  constructor() { this.ledger = new Map(); }
  async query(sql, params = []) {
    const S = sql.trim().replace(/\s+/g, ' ');
    if (S.startsWith('CREATE TABLE')) return { rows: [], rowCount: 0 };
    if (S.includes('INSERT INTO ping_effect_ledger')) {
      const opKey = params[0];
      if (this.ledger.has(opKey)) return { rows: [], rowCount: 0 };
      this.ledger.set(opKey, { op_key: opKey, mission_id: params[1], effect: params[2], input_digest: params[3], result: params[4], consequence: params[5] });
      return { rows: [], rowCount: 1 };
    }
    if (S.includes('FROM ping_effect_ledger')) {
      const row = this.ledger.get(params[0]);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    return { rows: [], rowCount: 0 };
  }
}
function makeMission(id) {
  return { mission_id: id, mission_type: 'OBSERVATION_CREATE', payload: { event_id: 'evt-1', event_type: 'REVIEW_RECEIVED', payload: { text: 'hi' } }, retries: 0 };
}
function makeEvent() {
  return { event_id: 'evt-x', event_type: 'REVIEW_RECEIVED', source: 'test', payload: { text: 'hi' }, metadata: {} };
}

async function main() {
  // 1. Default: legacy path.
  {
    const er = new FakeEventRuntime();
    const mr = new FakeMissionRuntime();
    const wr = new FakeWorkerRuntime();
    const sched = new MissionScheduler({ missionRuntime: mr, workerRuntime: wr, eventRuntime: er, pollIntervalMs: 100000 });
    assert.strictEqual(sched._unknownOutcomeDispatch, false, 'default must be false');
    const mission = makeMission('m-hold-default');
    mr.seed(mission);
    await sched._dispatch(mission);
    assert.strictEqual(wr.dispatchCount, 1, 'default: exactly one DIRECT workerRuntime.dispatch call');
    assert.strictEqual(er.emittedOf('EFFECT_DISPATCHED').length, 0, 'default: no EFFECT_DISPATCHED (executor not engaged)');
    assert.strictEqual(mr.missions.get('m-hold-default').status, 'completed', 'default: mission completes via legacy path');
    console.log('DEFAULT: legacy direct dispatch, 1 worker call, 0 EFFECT_DISPATCHED, completed — OK');
  }

  // 2. Opt-in: executor race path.
  {
    const er = new FakeEventRuntime();
    const mr = new FakeMissionRuntime();
    const wr = new FakeWorkerRuntime();
    const sched = new MissionScheduler({
      unknownOutcomeDispatch: true,
      missionRuntime: mr, workerRuntime: wr, eventRuntime: er,
      pool: new MockPool(), dispatchTimeoutMs: 5000, pollIntervalMs: 100000,
    });
    assert.strictEqual(sched._unknownOutcomeDispatch, true, 'opt-in flag must be true');
    const mission = makeMission('m-hold-optin');
    mr.seed(mission);
    await sched._dispatch(mission);
    assert.strictEqual(wr.dispatchCount, 1, 'opt-in: exactly one worker dispatch (through the executor race)');
    assert.strictEqual(er.emittedOf('EFFECT_DISPATCHED').length, 1, 'opt-in: EFFECT_DISPATCHED emitted once (executor path)');
    assert.strictEqual(mr.missions.get('m-hold-optin').status, 'completed', 'opt-in: mission completes via executor path');
    console.log('OPT-IN: executor race path, 1 worker call, 1 EFFECT_DISPATCHED, completed — OK');
  }

  // 3. Sweep gating, behaviorally: _poll() on the default scheduler must not
  // call sweepUnknown; on the opt-in scheduler it must.
  {
    const mkSched = (opts) => {
      const er = new FakeEventRuntime();
      const mr = new FakeMissionRuntime();
      const wr = new FakeWorkerRuntime();
      const s = new MissionScheduler({ missionRuntime: mr, workerRuntime: wr, eventRuntime: er, pool: new MockPool(), pollIntervalMs: 100000, dispatchTimeoutMs: 5000, ...opts });
      const orig = s._reconciler.sweepUnknown.bind(s._reconciler);
      s._sweepCalls = 0;
      s._reconciler.sweepUnknown = async (o) => { s._sweepCalls++; return orig(o); };
      return s;
    };
    const sDef = mkSched({});
    await sDef._poll();
    assert.strictEqual(sDef._sweepCalls, 0, 'default: _poll must not run the unknown-outcome sweep');
    const sOpt = mkSched({ unknownOutcomeDispatch: true });
    await sOpt._poll();
    assert.strictEqual(sOpt._sweepCalls, 1, 'opt-in: _poll must run the unknown-outcome sweep');
    console.log('SWEEP GATE: default=0 sweep calls, opt-in=1 sweep call — OK');
  }

  console.log('HOLD VERIFICATION: PASS');
}

main().catch((e) => { console.error('HOLD VERIFICATION: FAIL', e); process.exit(1); });
