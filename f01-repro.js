'use strict';
/**
 * F-01 REPRODUCTION — run against PRISTINE HEAD (/tmp/ping-head worktree).
 *
 * Demonstrates: a mission whose worker throws is put into retry_pending by
 * failWithRetry, and then EVERY subsequent poll re-dispatches it to the
 * worker with ZERO state progress (retries stuck, exhaustion never reached).
 *
 * Run: node /tmp/f01-repro.js   (on the Pig)
 */
const HEAD = '/tmp/ping-head/ping-runtime/orchestration';
const { MissionRuntime } = require(`${HEAD}/mission_runtime.js`);
const { MissionScheduler } = require(`${HEAD}/mission_scheduler.js`);

// ── Controllable clock: both the fake pool's NOW() and the runtime's
//    Date.now() (used for retry_at) follow this clock. ──
let fakeNow = Date.now();
const realDateNow = Date.now;
Date.now = () => fakeNow;
const iso = () => new Date(fakeNow).toISOString();

class FakePool {
  constructor() { this.missions = new Map(); }
  _inList(sql) {
    const m = sql.match(/status IN \(([^)]+)\)/);
    return m ? m[1].split(',').map(s => s.trim().replace(/'/g, '')) : null;
  }
  async query(sql, params = []) {
    const S = sql.replace(/\s+/g, ' ').trim();
    if (/^(CREATE|ALTER)/.test(S)) return { rows: [], rowCount: 0 };
    const byId = (id) => this.missions.get(id);

    if (S.includes('INSERT INTO ping_missions')) {
      const id = params[0];
      if (this.missions.has(id)) return { rows: [], rowCount: 0 };
      this.missions.set(id, {
        mission_id: id, mission_type: params[1], payload: params[2],
        priority: params[3] || 0, created_by: params[4] || null,
        status: 'created', result: null, assigned_to: null,
        created_at: iso(), started_at: null, completed_at: null,
        error: null, retries: 0, retry_at: null, lease_until: null, claimed_at: null,
      });
      return { rows: [], rowCount: 1 };
    }
    if (S.includes('SELECT retries FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ retries: m.retries }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT started_at FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ started_at: m.started_at }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT * FROM ping_missions') && S.includes('WHERE mission_id')) {
      const m = byId(params[0]);
      return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    // assign(): conditional created -> assigned
    if (S.includes("SET status = 'assigned'")) {
      const m = byId(params[1]);
      if (!m || m.status !== 'created') return { rows: [], rowCount: 0 };
      m.status = 'assigned'; m.assigned_to = params[0];
      m.claimed_at = iso(); m.lease_until = new Date(fakeNow + 60000).toISOString();
      return { rows: [{ mission_id: m.mission_id }], rowCount: 1 };
    }
    // start(): conditional assigned -> running
    if (S.includes("SET status = 'running'")) {
      const m = byId(params[0]);
      if (!m || m.status !== 'assigned') return { rows: [], rowCount: 0 };
      m.status = 'running'; m.started_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // complete(): conditional running -> completed
    if (S.includes("SET status = 'completed'")) {
      const m = byId(params[1]);
      if (!m || m.status !== 'running') return { rows: [], rowCount: 0 };
      m.status = 'completed'; m.result = params[0]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // failWithRetry exhaustion branch: SET status='failed', ..., retries=$2
    if (S.includes("SET status = 'failed'") && S.includes('retries')) {
      const m = byId(params[2]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'failed'; m.error = params[0]; m.retries = params[1]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // plain fail()
    if (S.includes("SET status = 'failed'")) {
      const m = byId(params[1]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'failed'; m.error = params[0]; m.completed_at = iso();
      return { rows: [], rowCount: 1 };
    }
    // failWithRetry retry branch: SET status='retry_pending', error, retries, retry_at
    if (S.includes("SET status = 'retry_pending'")) {
      const m = byId(params[3]);
      const allowed = this._inList(S) || [];
      if (!m || !allowed.includes(m.status)) return { rows: [], rowCount: 0 };
      m.status = 'retry_pending'; m.error = params[0]; m.retries = params[1]; m.retry_at = params[2];
      return { rows: [], rowCount: 1 };
    }
    // renewLease()
    if (S.includes('SET lease_until = NOW()')) {
      const m = byId(params[1]);
      if (!m || !['running', 'assigned'].includes(m.status) || !m.lease_until) return { rows: [], rowCount: 0 };
      m.lease_until = new Date(fakeNow + params[0] * 1000).toISOString();
      return { rows: [], rowCount: 1 };
    }
    // reapExpiredLeases()
    if (S.includes("SET status = 'created', assigned_to = NULL")) {
      const out = [];
      for (const m of this.missions.values()) {
        if (['running', 'assigned'].includes(m.status) && m.lease_until && Date.parse(m.lease_until) < fakeNow) {
          m.status = 'created'; m.assigned_to = null; m.lease_until = null;
          m.claimed_at = null; m.retry_at = iso();
          out.push({ mission_id: m.mission_id });
        }
      }
      return { rows: out, rowCount: out.length };
    }
    // getPending(): created + retry_pending with retry_at <= NOW()
    if (S.includes('WHERE status =') && S.includes('LIMIT')) {
      const limit = params[0] || 10;
      const rows = [...this.missions.values()]
        .filter(m => m.status === 'created' ||
          (m.status === 'retry_pending' && m.retry_at && Date.parse(m.retry_at) <= fakeNow))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, limit);
      return { rows, rowCount: rows.length };
    }
    throw new Error(`FakePool: unhandled SQL: ${S.slice(0, 120)}`);
  }
}

function fakeEventRuntime() {
  const emitted = [];
  return { emitted, async emit(t, s, p = {}) { emitted.push({ type: t, source: s, payload: p }); return { status: 'ok' }; } };
}

(async () => {
  const pool = new FakePool();
  const events = fakeEventRuntime();
  let invocations = 0;
  const workerRuntime = {
    getStats: () => ({ workers: { observation: {} } }),
    async dispatch(event) { invocations++; throw new Error('worker boom'); },
  };
  const mr = new MissionRuntime({ pool, eventRuntime: events });
  const sched = new MissionScheduler({
    missionRuntime: mr, workerRuntime, eventRuntime: events,
    retryPolicy: { max_attempts: 3, backoff_delay_ms: 5000 },
    pollIntervalMs: 3600000, // manual _poll() only
  });

  const missionId = await mr.create('LEAD_FOLLOWUP', {
    event_id: 'evt-f01', event_type: 'LEAD_CREATED', correlation_id: 'corr-f01',
  });
  console.log('mission:', missionId);

  const history = [];
  for (let cycle = 1; cycle <= 6; cycle++) {
    fakeNow += 6000; // move past the 5s backoff gate
    await sched._poll();
    const m = pool.missions.get(missionId);
    history.push({ cycle, invocations, status: m.status, retries: m.retries });
    console.log(`poll #${cycle}: workerInvocations=${invocations} status=${m.status} retries=${m.retries}`);
  }

  console.log('\n── F-01 verdict ──');
  const last = history[history.length - 1];
  const stuckRetries = history.every(h => h.retries === 1);
  const reexecutedEveryPoll = history.every((h, i) => h.invocations === i + 1);
  console.log(`worker re-executed on every poll (6/6): ${reexecutedEveryPoll}`);
  console.log(`retries stuck at 1 (zero state progress): ${stuckRetries}`);
  console.log(`terminal state reached: ${['failed', 'completed'].includes(last.status)} (status=${last.status})`);
  console.log(`exhaustion (max_attempts=3) ever reached: ${history.some(h => h.retries >= 3)}`);
  if (reexecutedEveryPoll && stuckRetries && last.status === 'retry_pending') {
    console.log('RESULT: F-01 REPRODUCED — infinite identical re-execution, no state progress');
  } else {
    console.log('RESULT: F-01 NOT reproduced');
  }
  Date.now = realDateNow;
})().catch(err => { console.error('REPRO ERROR:', err); process.exit(2); });
