/**
 * Durability Invariants — Post-P0 regression gate
 *
 * Probes the 9 specific invariants the CEO directive requires:
 *   1. retry_pending + retry_at persists across process restart
 *   2. Exhausted missions remain terminal
 *   3. lease_until expiration is actually reclaimed (assigned, never started)
 *   4. reapExpiredLeases cannot reclaim a newly renewed lease
 *   5. Two scheduler cycles cannot execute the same mission concurrently
 *   6. Dead-letter recording happens exactly once
 *   7. Successful completion cannot be subsequently reaped
 *   7b. Lease expiry NEVER resets a running mission to created (PARK/HOLD)
 *   7c. Assigned-but-never-started IS still reaped
 *   8. Completed mission cannot be resurrected by stale start()
 *
 * Pure mock-pool, zero Docker, zero side effects.
 * Run: node gateway/test_durability_invariants.js
 */

const assert = require('assert');
const { MissionRuntime } = require('../ping-runtime/orchestration/mission_runtime');
const { MissionScheduler } = require('../ping-runtime/orchestration/mission_scheduler');
const { WorkerRuntime } = require('../ping-runtime/workers/worker_runtime');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== Durability Invariants (Post-P0) ===\n');
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${name}`);
      console.log(`    ${String(err.message).split('\n')[0]}`);
      failed++;
    }
  }
  console.log(`\nPassed: ${passed} / ${passed + failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Mock pool ──────────────────────────────────────────────────────

class MockPool {
  constructor() {
    this._tables = { ping_missions: [] };
  }

  async query(sql, params = []) {
    const S = sql.trim().replace(/\s+/g, ' ');
    if (S.startsWith('CREATE') || S.startsWith('ALTER')) return { rows: [], rowCount: 0 };

    // getPending — created + retry_pending with retry_at <= NOW()
    if (S.includes('WHERE status =') && S.includes('LIMIT')) {
      const limit = params[0] || 10;
      const now = Date.now();
      const pending = this._tables.ping_missions
        .filter(m => m.status === 'created' ||
          (m.status === 'retry_pending' && m.retry_at && new Date(m.retry_at).getTime() <= now))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, limit);
      return { rows: pending, rowCount: pending.length };
    }

    // SELECT retries (failWithRetry pre-read)
    if (S.includes('SELECT retries') && S.includes('WHERE mission_id')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      return { rows: m ? [{ retries: m.retries || 0 }] : [], rowCount: m ? 1 : 0 };
    }

    // SELECT started_at (complete() duration)
    if (S.includes('SELECT started_at')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      return { rows: m ? [{ started_at: m.started_at }] : [], rowCount: 1 };
    }

    // SELECT * WHERE mission_id (getTrace or _findMission)
    if (S.includes('FROM ping_missions') && S.includes('WHERE mission_id') && S.includes('SELECT *')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      return { rows: m ? [m] : [], rowCount: m ? 1 : 0 };
    }

    // INSERT INTO ping_missions — ON CONFLICT DO NOTHING
    if (S.includes('INSERT INTO ping_missions')) {
      const existing = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      if (existing) return { rows: [], rowCount: 0 }; // ON CONFLICT DO NOTHING
      const mission = {
        mission_id: params[0], mission_type: params[1], payload: params[2],
        priority: params[3] || 0, created_by: params[4] || null,
        status: 'created', result: null, assigned_to: null,
        created_at: new Date().toISOString(),
        started_at: null, completed_at: null, error: null, retries: 0,
        retry_at: null, lease_until: null, claimed_at: null,
      };
      this._tables.ping_missions.push(mission);
      return { rows: [], rowCount: 1 };
    }

    // assign() — conditional transition
    if (S.includes("SET status = 'assigned'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[1]);
      if (!m) return { rows: [], rowCount: 0 };
      const conditional = S.includes("status = 'created'");
      if (conditional && m.status !== 'created') return { rows: [], rowCount: 0 };
      m.status = 'assigned';
      m.assigned_to = params[0];
      if (S.includes('claimed_at')) {
        m.claimed_at = new Date().toISOString();
        m.lease_until = new Date(Date.now() + 60000).toISOString();
      }
      return { rows: [], rowCount: 1 };
    }

    // start() — conditional: only from 'assigned'
    if (S.includes("SET status = 'running'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      if (!m) return { rows: [], rowCount: 0 };
      const conditional = S.includes("status = 'assigned'");
      if (conditional && m.status !== 'assigned') return { rows: [], rowCount: 0 };
      m.status = 'running'; m.started_at = new Date().toISOString();
      return { rows: [], rowCount: 1 };
    }

    // complete() — conditional: only from 'running'
    if (S.includes("SET status = 'completed'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[1]);
      if (!m) return { rows: [], rowCount: 0 };
      const conditional = S.includes("status = 'running'");
      if (conditional && m.status !== 'running') return { rows: [], rowCount: 0 };
      m.status = 'completed'; m.result = JSON.parse(params[0]); m.completed_at = new Date().toISOString();
      return { rows: [], rowCount: 1 };
    }

    // failWithRetry exhaustion → failed (has retries in SET)
    if (S.includes("SET status = 'failed'") && S.includes('retries')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[2]);
      if (m) { m.status = 'failed'; m.error = params[0]; m.retries = params[1]; m.completed_at = new Date().toISOString(); }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // fail() — plain failure
    if (S.includes("SET status = 'failed'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[1]);
      if (m) { m.status = 'failed'; m.error = params[0]; m.completed_at = new Date().toISOString(); }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // failWithRetry → retry_pending
    if (S.includes("SET status = 'retry_pending'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[3]);
      if (m) {
        m.status = 'retry_pending';
        m.error = params[0];
        m.retries = params[1];
        m.retry_at = params[2];
      }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // lease reaper — mirrors the real MissionRuntime.reapExpiredLeases()
    // constitutional narrowing (Nolan 2026-09-24): ONLY "abandoned, known not
    // to have started" (assigned + started_at null + expired lease) returns
    // to created. A mission that reached 'running' may have produced an
    // external effect and is NEVER reset to created — those escalate to HOLD
    // via findOrphanedRunning().
    if (S.includes('lease_until') && S.includes('RETURNING')) {
      const now = Date.now();
      const reclaimed = [];
      for (const m of this._tables.ping_missions) {
        if (m.lease_until && new Date(m.lease_until).getTime() < now && m.status === 'assigned' && !m.started_at) {
          m.status = 'created';
          m.assigned_to = null;
          m.lease_until = null;
          m.claimed_at = null;
          m.retry_at = new Date().toISOString();
          reclaimed.push({ mission_id: m.mission_id });
        }
      }
      return { rows: reclaimed, rowCount: reclaimed.length };
    }

    return { rows: [], rowCount: 0 };
  }
}

function fakeEventRuntime() {
  const emitted = [];
  return {
    emitted,
    async emit(eventType, source, payload = {}) {
      emitted.push({ event_type: eventType, payload });
      return { status: 'ok' };
    },
  };
}

function okWorker() {
  return { async handle(event) { return { status: 'ok', event_id: event.event_id }; } };
}
function throwingWorker(msg = 'boom') {
  return { async handle() { throw new Error(msg); } };
}

function makeMr() {
  const pool = new MockPool();
  const mr = new MissionRuntime({ pool, eventRuntime: fakeEventRuntime() });
  return { pool, mr };
}

async function findMission(pool, id) {
  const res = await pool.query('SELECT * FROM ping_missions WHERE mission_id = $1', [id]);
  return res.rows[0];
}

// ─── INV-1: retry_pending + retry_at persists across process restart ─

test('INV-1: retry_pending state survives simulated process restart', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('LEAD_FOLLOWUP', { event_type: 'LEAD_CREATED' });
  await mr.assign(id, 'observation');

  // Fail with retry → retry_pending
  await mr.failWithRetry(id, 'transient', { max_attempts: 3, backoff_delay_ms: 10000 });
  const m = await findMission(pool, id);
  assert.strictEqual(m.status, 'retry_pending');
  assert.ok(m.retry_at, 'retry_at persisted');

  // Simulate restart: create a NEW MissionRuntime with same pool
  const mr2 = new MissionRuntime({ pool, eventRuntime: fakeEventRuntime() });

  // retry_pending with future retry_at → not claimable
  const pending1 = await mr2.getPending(5);
  assert.ok(!pending1.some(p => p.mission_id === id), 'retry_pending invisible before retry_at');

  // Set retry_at to past (simulating time passing across restart)
  m.retry_at = new Date(Date.now() - 1000).toISOString();
  const pending2 = await mr2.getPending(5);
  assert.ok(pending2.some(p => p.mission_id === id), 'retry_pending visible after retry_at elapses');
});

// ─── INV-2: Exhausted missions remain terminal ──────────────────────

test('INV-2: exhausted mission stays failed, never re-enters pending', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('INVOICE_TRACK', { event_type: 'INVOICE_SENT' });

  // Fail until exhaustion (max_attempts=2)
  await mr.failWithRetry(id, 'e1', { max_attempts: 2, backoff_delay_ms: 10 });
  await mr.failWithRetry(id, 'e2', { max_attempts: 2, backoff_delay_ms: 10 });
  await mr.failWithRetry(id, 'e3', { max_attempts: 2, backoff_delay_ms: 10 });

  const m = await findMission(pool, id);
  assert.strictEqual(m.status, 'failed', 'exhausted = failed');

  // Even with retry_at in the past, exhausted mission never re-enters pending
  m.retry_at = new Date(Date.now() - 10000).toISOString();
  const pending = await mr.getPending(5);
  assert.ok(!pending.some(p => p.mission_id === id), 'failed mission never re-enters pending');
});

// ─── INV-3: lease expiry is actually reclaimed ──────────────────────

test('INV-3: assigned mission with expired lease is reclaimed', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('PROJECT_SETUP', { event_type: 'PROJECT_CREATED' });
  await mr.assign(id, 'observation');

  // Simulate lease expiry
  const m = await findMission(pool, id);
  m.lease_until = new Date(Date.now() - 10000).toISOString();

  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 1, 'one mission reclaimed');

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'created', 'reclaimed to available');
  assert.strictEqual(after.assigned_to, null, 'assignment cleared');
});

// ─── INV-4: reapExpiredLeases cannot reclaim a live lease ───────────

test('INV-4: running mission with future lease is NOT reclaimed', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('CUSTOMER_ONBOARD', { event_type: 'CUSTOMER_CREATED' });
  await mr.assign(id, 'observation');
  await mr.start(id);

  // lease_until is 60s from now (set by assign)
  const m = await findMission(pool, id);
  assert.ok(new Date(m.lease_until).getTime() > Date.now(), 'lease is in the future');

  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 0, 'no reclamation on live lease');

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'running', 'still running');
});

// ─── INV-5: two schedulers cannot double-dispatch ───────────────────

test('INV-5: concurrent schedulers cannot steal the same mission', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('REVIEW_RESPONSE', { event_type: 'REVIEW_RECEIVED' });

  // Scheduler A claims
  const r1 = await mr.assign(id, 'scheduler-A');
  assert.strictEqual(r1, 1, 'scheduler-A claims successfully');

  // Scheduler B tries to claim same mission
  const r2 = await mr.assign(id, 'scheduler-B');
  assert.strictEqual(r2, 0, 'scheduler-B is rejected');

  const m = await findMission(pool, id);
  assert.strictEqual(m.assigned_to, 'scheduler-A', 'assignment not stolen');
});

// ─── INV-6: dead-letter happens exactly once ────────────────────────

test('INV-6: DLQ records exactly once per exhaustion, never on retry', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('ESTIMATE_PREPARE', { event_type: 'ESTIMATE_REQUESTED' });

  const wr = new WorkerRuntime();
  wr.register('observation', throwingWorker('permanent'), { eventTypes: ['ESTIMATE_REQUESTED'] });

  const dlqCalls = [];
  const dlq = {
    async recordDeadLetter(job, error) {
      dlqCalls.push({ job, error: error.message });
      return `dl-${job.job_id}`;
    },
  };

  const scheduler = new MissionScheduler({
    missionRuntime: mr,
    workerRuntime: wr,
    eventRuntime: fakeEventRuntime(),
    deadLetterAuthority: dlq,
    retryPolicy: { max_attempts: 1, backoff_delay_ms: 0 },
  });

  const mission = (await mr.getPending(5))[0];
  await scheduler._dispatch(mission);

  assert.strictEqual(dlqCalls.length, 1, 'DLQ called exactly once');
  assert.strictEqual(dlqCalls[0].job.job_id, id);

  // Mission is now failed (exhausted), not retry_pending
  const m = await findMission(pool, id);
  assert.strictEqual(m.status, 'failed');
});

// ─── INV-7: completed mission cannot be reaped ──────────────────────

test('INV-7: completed mission is not reclaimed by lease reaper', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('EMAIL_PROCESS', { event_type: 'EMAIL_RECEIVED' });
  await mr.assign(id, 'observation');
  await mr.start(id);
  await mr.complete(id, { status: 'ok' });

  const m = await findMission(pool, id);
  assert.strictEqual(m.status, 'completed');

  // Even if lease_until were somehow in the past (shouldn't happen but test defense)
  m.lease_until = new Date(Date.now() - 10000).toISOString();

  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 0, 'completed mission not reclaimed');

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'completed', 'still completed');
});

// ─── INV-7b: lease expiry NEVER resets a running mission to created ───
// Constitutional PARK/HOLD (Nolan 2026-09-24): a mission that reached
// 'running' may have produced an external effect. Lease expiry must not turn
// it back into created — that would be an automatic retry of an
// unknown-outcome execution. The orphan escalator parks it as HOLD instead.

test('INV-7b: expired lease on a RUNNING mission is not reaped to created', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('EMAIL_PROCESS', { event_type: 'EMAIL_RECEIVED' });
  await mr.assign(id, 'observation');
  await mr.start(id);

  const m = await findMission(pool, id);
  m.lease_until = new Date(Date.now() - 10000).toISOString();

  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 0, 'running mission never reaped to created');

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'running', 'still running — escalation to HOLD is the scheduler\'s job');
});

// ─── INV-7c: assigned-but-never-started IS still reaped ────────────────
// started_at null means the worker was never invoked: known not to have
// started, so reset to created for re-claim is the safe path.

test('INV-7c: assigned mission that never started is reclaimed by lease reaper', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('EMAIL_PROCESS', { event_type: 'EMAIL_RECEIVED' });
  await mr.assign(id, 'observation');
  // never started: started_at stays null

  const m = await findMission(pool, id);
  assert.strictEqual(m.started_at, null, 'started_at null — worker never invoked');
  m.lease_until = new Date(Date.now() - 10000).toISOString();

  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 1, 'abandoned-not-started reclaimed');

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'created', 'reset to created for re-claim');
});

// ─── Bonus: reap sets retry_at = NOW so mission is immediately claimable ─

test('INV-3b: reclaimed mission is immediately claimable (retry_at = NOW)', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('SYSTEM_HEALTH_CHECK', { event_type: 'SYSTEM_STARTUP' });
  await mr.assign(id, 'observation');

  const m = await findMission(pool, id);
  m.lease_until = new Date(Date.now() - 5000).toISOString();

  await mr.reapExpiredLeases();

  const pending = await mr.getPending(5);
  assert.ok(pending.some(p => p.mission_id === id), 'reclaimed mission is claimable');
  const claimed = pending.find(p => p.mission_id === id);
  assert.strictEqual(claimed.status, 'created');
});

// ─── INV-8: completed mission cannot be started (resurrection guard) ──

test('INV-8: completed mission is NOT resurrected by stale start()', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('CUSTOMER_ONBOARD', { event_type: 'CUSTOMER_CREATED' });
  await mr.assign(id, 'observation');
  await mr.start(id);
  await mr.complete(id, { ok: true });

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'completed', 'mission is completed');

  // Stale start() must not resurrect
  await mr.start(id);

  const final_ = await findMission(pool, id);
  assert.strictEqual(final_.status, 'completed', 'still completed — not resurrected');
});

// ─── INV-9: failed mission cannot be completed (stale-complete guard) ─

test('INV-9: failed mission is NOT overwritten by stale complete()', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('CUSTOMER_ONBOARD', { event_type: 'CUSTOMER_CREATED' });
  await mr.assign(id, 'observation');
  await mr.start(id);

  // failWithRetry pushes to retry_pending (retries = 1 > max = 1 triggers exhaustion → failed)
  await mr.failWithRetry(id, new Error('boom'), { max_attempts: 1, backoff_delay_ms: 0 });

  const after = await findMission(pool, id);
  assert.strictEqual(after.status, 'failed', 'mission is failed (exhausted)');

  // Stale complete() must not overwrite
  await mr.complete(id, { ok: true });

  const final_ = await findMission(pool, id);
  assert.strictEqual(final_.status, 'failed', 'still failed — not overwritten');
});

// ─── INV-10: same event_id produces exactly one mission ─────────────

test('INV-10: duplicate event_id yields same mission_id (idempotent create)', async () => {
  const { pool, mr } = makeMr();
  const payload = { event_id: 'EVT-IDEMPOTENT-001', event_type: 'REVIEW_RECEIVED' };

  const id1 = await mr.create('REVIEW_RESPONSE', payload, { priority: 3 });
  const id2 = await mr.create('REVIEW_RESPONSE', payload, { priority: 3 });

  assert.strictEqual(id1, id2, 'same event_id produces same mission_id');

  // Only one mission in the table
  const all = await pool.query('SELECT * FROM ping_missions WHERE mission_id = $1', [id1]);
  assert.strictEqual(all.rows.length, 1, 'exactly one mission row');
});

run();
