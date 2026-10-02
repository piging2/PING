'use strict';
/**
 * hung-worker-harness.js — ORCA-B probe.
 *
 * Tests the C2 / GAPS.md GAP 5 claim against the REAL mainline modules
 * (mission_scheduler.js + mission_runtime.js, copied read-only from
 * /home/nolan/ping @ cc6856c3b): a worker whose handle() never resolves
 * must be shown to (a) hold its scheduler slot forever, (b) get its lease
 * renewed every poll so reapExpiredLeases() never reclaims it, and
 * (c) stall the scheduler permanently at maxConcurrent=3 with a 4th mission
 * left 'created' forever.
 *
 * The only fakes: the PG pool (in-memory mission rows, faithful SQL-shape
 * semantics for the statements these two modules issue) and the
 * WorkerRuntime (hung vs fast handle). Nothing in the two modules under
 * test is modified. Any unrecognized query throws loudly (no silent fakes).
 */

const path = require('path');
const { MissionRuntime } = require('./vendor/orchestration/mission_runtime.js');
const { MissionScheduler } = require('./vendor/orchestration/mission_scheduler.js');

class FakePool {
  constructor() {
    this.missions = new Map();
    this.calls = { renewLease: 0, reap: 0 };
  }
  async query(text, params = []) {
    const t = text.replace(/\s+/g, ' ');
    if (/CREATE TABLE|CREATE INDEX|ALTER TABLE/.test(t)) return { rowCount: 0, rows: [] };
    if (/INSERT INTO ping_missions/.test(t)) {
      const [mission_id, mission_type, payload, priority, created_by] = params;
      if (this.missions.has(mission_id)) return { rowCount: 0, rows: [] };
      this.missions.set(mission_id, {
        mission_id, mission_type, status: 'created', priority, payload,
        result: null, assigned_to: null, created_by, created_at: new Date(),
        started_at: null, completed_at: null, error: null, retries: 0,
        retry_at: null, lease_until: null, claimed_at: null,
      });
      return { rowCount: 1, rows: [] };
    }
    if (/SET status = 'assigned'/.test(t)) {
      const [workerName, missionId] = params;
      const m = this.missions.get(missionId);
      if (m && m.status === 'created') {
        m.status = 'assigned'; m.assigned_to = workerName;
        m.claimed_at = new Date(); m.lease_until = new Date(Date.now() + 60000);
        return { rowCount: 1, rows: [{ mission_id: missionId }] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (/SET status = 'running'/.test(t)) {
      const [missionId] = params;
      const m = this.missions.get(missionId);
      if (m && m.status === 'assigned') { m.status = 'running'; m.started_at = new Date(); return { rowCount: 1, rows: [] }; }
      return { rowCount: 0, rows: [] };
    }
    if (/SET status = 'completed'/.test(t)) {
      const [resultJson, missionId] = params;
      const m = this.missions.get(missionId);
      if (m && m.status === 'running') {
        m.status = 'completed'; m.result = resultJson; m.completed_at = new Date();
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (/SET lease_until = NOW\(\)/.test(t)) { // renewLease
      this.calls.renewLease++;
      const [durationSeconds, missionId] = params;
      const m = this.missions.get(missionId);
      if (m && (m.status === 'running' || m.status === 'assigned') && m.lease_until !== null) {
        m.lease_until = new Date(Date.now() + durationSeconds * 1000);
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (/SET status = 'created', assigned_to = NULL/.test(t)) { // reapExpiredLeases
      this.calls.reap++;
      const now = new Date();
      const reaped = [];
      for (const m of this.missions.values()) {
        if ((m.status === 'running' || m.status === 'assigned') && m.lease_until !== null && m.lease_until < now) {
          m.status = 'created'; m.assigned_to = null; m.lease_until = null;
          m.claimed_at = null; m.retry_at = now;
          reaped.push({ mission_id: m.mission_id });
        }
      }
      return { rowCount: reaped.length, rows: reaped };
    }
    if (/SELECT \* FROM ping_missions/.test(t) && /IN \('assigned', 'running'\)/.test(t)) { // getActive
      const rows = [...this.missions.values()]
        .filter((m) => m.status === 'assigned' || m.status === 'running')
        .sort((a, b) => b.priority - a.priority)
        .map((m) => ({ ...m }));
      return { rowCount: rows.length, rows };
    }
    if (/SELECT \* FROM ping_missions/.test(t) && /status = 'created'/.test(t)) { // getPending
      const [limit] = params;
      const rows = [...this.missions.values()]
        .filter((m) => m.status === 'created'
          || (m.status === 'retry_pending' && m.retry_at !== null && m.retry_at <= new Date()))
        .sort((a, b) => (b.priority - a.priority) || (a.created_at - b.created_at))
        .slice(0, limit || 10)
        .map((m) => ({ ...m }));
      return { rowCount: rows.length, rows };
    }
    if (/SELECT status, COUNT\(\*\)/.test(t)) { // getStats
      const counts = {};
      for (const m of this.missions.values()) counts[m.status] = (counts[m.status] || 0) + 1;
      return { rowCount: Object.keys(counts).length, rows: Object.entries(counts).map(([status, count]) => ({ status, count: String(count) })) };
    }
    throw new Error('FAKE POOL: unrecognized query: ' + t.slice(0, 120));
  }
}

function makeWorkerRuntime(mode) {
  const hung = mode === 'hung';
  return {
    getStats() {
      return { workers: { observation: { status: hung ? 'processing' : 'idle', running: 0, maxConcurrent: 10 } } };
    },
    async dispatch(event) {
      if (hung) return new Promise(() => {}); // never resolves, never throws
      return { status: 'ok' };
    },
    async health() { return {}; },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runPhase(mode, label) {
  const pool = new FakePool();
  const mr = new MissionRuntime({ pool, eventRuntime: null });
  await mr.initialize();
  const workerRuntime = makeWorkerRuntime(mode);
  const sched = new MissionScheduler({
    missionRuntime: mr, workerRuntime, eventRuntime: null,
    pollIntervalMs: 200, maxConcurrent: 3,
  });
  for (let i = 0; i < 4; i++) {
    await mr.create('LEAD_FOLLOWUP', { event_id: `evt-${mode}-${i}`, event_type: 'LEAD_CREATED', source: 'probe', namespace: 'probe', payload: {} }, { priority: i });
  }
  sched.start();
  await sleep(mode === 'hung' ? 2000 : 1200);
  const stats = await mr.getStats();
  const active = await mr.getActive();
  const pending = await mr.getPending(10);
  const renewCalls = pool.calls.renewLease;
  const reapCalls = pool.calls.reap;
  const leaseFutures = active.map((m) => ({ id: m.mission_id.slice(0, 8), lease_in_future_ms: new Date(m.lease_until).getTime() - Date.now() }));
  const procSize = sched._processing.size;
  sched.stop();
  await sleep(50);
  return { label, stats, procSize, pendingCount: pending.length, renewCalls, reapCalls, leaseFutures, schedStats: sched._stats };
}

(async () => {
  const fast = await runPhase('fast', 'control: fast worker');
  const hung = await runPhase('hung', 'experiment: hung worker');
  console.log(JSON.stringify({ fast, hung }, null, 2));
})().catch((e) => { console.error('HARNESS FAILED:', e); process.exit(1); });
