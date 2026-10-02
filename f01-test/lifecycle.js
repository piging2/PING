/**
 * Durable Mission Lifecycle — GOLDEN TEST (write-first, run-last)
 *
 * Track A P0 acceptance contract. Exercises the TARGET durable execution
 * semantics encoded in docs/READ_ONLY_PATCH_PLAN_EXECUTION_GATE.md:
 *
 *   RECEIVED → PERSISTED → AVAILABLE → CLAIMED → RUNNING
 *       → COMPLETED (verified {status:'ok'})
 *       → RETRY_PENDING → AVAILABLE (backoff)
 *       → FAILED → DEAD_LETTERED (exhaustion)
 *       → AVAILABLE (lease reaper reclaims stragglers)
 *
 * Pure mock-pool — no Docker, no Postgres. Forward-specified: asserts the
 * REQUIRED behavior of P0-1…P0-6. When run against the current (pre-P0) code
 * it FAILS (red) on exactly the documented defects:
 *
 *   G1-T1  WorkerRuntime.dispatch() swallows worker errors  (P0-2)
 *   G1-T2  MissionScheduler phantom-completes on failure    (P0-3)
 *   G1-T3  assign() is not a conditional transition         (P0-1)
 *   G3-T5  failWithRetry() / retry_at gating do not exist   (P0-4)
 *   G4-T7  exhaustion does not reach a dead-letter store    (P0-5)
 *   G5-T8  expired lease on RUNNING is never reaped to created (PARK/HOLD) (P0-6)
 *
 * After P0-1…P0-6 land, this suite must be fully green (G2-T4 baseline happy
 * path is green today and must stay green).
 *
 * Run: node gateway/test_durable_mission_lifecycle.js
 */

const assert = require('assert');
const { MissionRuntime } = require('../ping-runtime/orchestration/mission_runtime');
const { MissionScheduler } = require('../ping-runtime/orchestration/mission_scheduler');
const { WorkerRuntime } = require('../ping-runtime/workers/worker_runtime');

// ─── Test runner ──────────────────────────────────────────────────────
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

async function run() {
  console.log('=== Durable Mission Lifecycle (Golden — P0 contract) ===\n');
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
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log(failed > 0
    ? 'RED — defects present (expected pre-P0). P0-1…P0-6 must turn these green.'
    : 'GREEN — durable lifecycle contract satisfied.');
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Mock pool (forward-tolerant; honours SQL shape, incl. P0 deltas) ─

class MockPool {
  constructor() {
    this._tables = { ping_events: [], ping_missions: [], repository_dead_letters: [] };
    this._now = () => Date.now();
  }

  async query(sql, params = []) {
    const S = sql.trim().replace(/\s+/g, ' ');
    if (S.startsWith('CREATE')) return { rows: [], rowCount: 0 };

    // getPending — created + retry_pending with retry_at <= NOW()
    if (S.includes('WHERE status =') && S.includes('LIMIT')) {
      const limit = params[0] || 10;
      const now = this._now();
      const pending = this._tables.ping_missions
        .filter(m => m.status === 'created' || (m.status === 'retry_pending' && m.retry_at && m.retry_at <= now))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, limit);
      return { rows: pending, rowCount: pending.length };
    }

    // SELECT retries ... (failWithRetry pre-read) or SELECT * ... WHERE mission_id
    if (S.includes('FROM ping_missions') && S.includes('WHERE mission_id')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      if (S.includes('SELECT retries')) {
        return { rows: m ? [{ retries: m.retries || 0 }] : [], rowCount: m ? 1 : 0 };
      }
      return { rows: m ? [m] : [], rowCount: m ? 1 : 0 };
    }

    // SELECT started_at ... (complete() duration)
    if (S.includes('SELECT started_at')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[0]);
      return { rows: m ? [{ started_at: m.started_at }] : [], rowCount: 1 };
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

    // assign() — P0: conditional transition (WHERE ... AND status='created')
    if (S.includes("SET status = 'assigned'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[1]);
      if (!m) return { rows: [], rowCount: 0 };
      const conditional = S.includes("status = 'created'");
      if (conditional && m.status !== 'created') return { rows: [], rowCount: 0 };
      m.status = 'assigned';
      m.assigned_to = params[0];
      if (S.includes('claimed_at')) {
        m.claimed_at = new Date().toISOString();
        m.lease_until = new Date(this._now() + 60000).toISOString();
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

    // failWithRetry exhaustion → failed (has retries column in SET)
    if (S.includes("SET status = 'failed'") && S.includes('retries')) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[2]);
      if (m) { m.status = 'failed'; m.error = params[0]; m.retries = params[1]; m.completed_at = new Date().toISOString(); }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // fail() — plain failure (no retries column in SET)
    if (S.includes("SET status = 'failed'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[1]);
      if (m) { m.status = 'failed'; m.error = params[0]; m.completed_at = new Date().toISOString(); }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // failWithRetry → retry_pending (retries = retries + 1, retry_at set)
    if (S.includes("SET status = 'retry_pending'")) {
      const m = this._tables.ping_missions.find(m => m.mission_id === params[3]);
      if (m) {
        m.status = 'retry_pending';
        m.error = params[0];
        m.retries = params[1];           // $2 = nextRetry count
        m.retry_at = params[2];          // $3 = ISO timestamp
      }
      return { rows: [], rowCount: m ? 1 : 0 };
    }

    // lease reaper — mirrors the real MissionRuntime.reapExpiredLeases()
    // constitutional narrowing (Nolan 2026-09-24): ONLY "abandoned, known not
    // to have started" (assigned + started_at null + expired lease) returns
    // to created. Running missions may have produced external effects and are
    // NEVER reset to created — they escalate to HOLD via the scheduler.
    if (S.includes('lease_until')) {
      const now = this._now();
      let n = 0;
      for (const m of this._tables.ping_missions) {
        if (m.lease_until && new Date(m.lease_until).getTime() < now && m.status === 'assigned' && !m.started_at) {
          m.status = 'created';
          m.assigned_to = null;
          m.lease_until = null;
          m.claimed_at = null;
          m.retry_at = now;
          n++;
        }
      }
      return { rows: [], rowCount: n };
    }

    return { rows: [], rowCount: 0 };
  }
}

/** Fake eventRuntime recording emitted events (for MISSION_* emissions). */
function fakeEventRuntime() {
  const emitted = [];
  return {
    emitted,
    async emit(eventType, source, payload = {}) {
      emitted.push({ event_type: eventType, payload });
      return { status: 'ok', eventId: `evt-${emitted.length}` };
    },
  };
}

/** Minimal result-contract worker factory. */
function okWorker() {
  return { async handle(event) { return { status: 'ok', event_id: event.event_id }; } };
}
function throwingWorker(message = 'boom') {
  return { async handle() { throw new Error(message); } };
}

function makeMr(overrides = {}) {
  const pool = new MockPool();
  const mr = new MissionRuntime({ pool, eventRuntime: fakeEventRuntime(), ...overrides });
  return { pool, mr };
}

// ─── G2: Baseline happy path (green today, must stay green) ──────────

test('G2-T4: created → assigned → running → completed (verified ok)', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('REVIEW_RESPONSE', { event_type: 'REVIEW_RECEIVED', review_id: 'r1' });
  assert.ok(id, 'mission id returned');

  const rows1 = await mr.getPending(5);
  assert.strictEqual(rows1.length, 1, 'mission is AVAILABLE');
  assert.strictEqual(rows1[0].status, 'created');

  await mr.assign(id, 'observation');
  let m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'assigned', 'CLAIMED');
  assert.strictEqual(m.assigned_to, 'observation', 'CLAIMED by observation');

  await mr.start(id);
  m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'running', 'RUNNING');

  await mr.complete(id, { status: 'ok', worker: 'observation' });
  m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'completed', 'COMPLETED');
  assert.strictEqual(m.result.status, 'ok', 'result preserved');
});

// ─── G1: Current-defect documentation (RED until P0) ─────────────────

test('G1-T1: dispatch() REJECTS when a worker throws (P0-2)', async () => {
  const wr = new WorkerRuntime();
  wr.register('observation', throwingWorker(), { eventTypes: ['REVIEW_RECEIVED'] });
  await assert.rejects(
    () => wr.dispatch({ event_id: 'evt-1', event_type: 'REVIEW_RECEIVED', payload: {} }),
    /boom/,
    'worker failure must propagate to the caller (scheduler)'
  );
});

test('G1-T2: scheduler does NOT phantom-complete on worker failure (P0-3)', async () => {
  const { mr } = makeMr();
  const id = await mr.create('REVIEW_RESPONSE', { event_type: 'REVIEW_RECEIVED', review_id: 'r1' });

  const wr = new WorkerRuntime();
  wr.register('observation', throwingWorker('worker exploded'), { eventTypes: ['REVIEW_RECEIVED'] });

  const scheduler = new MissionScheduler({ missionRuntime: mr, workerRuntime: wr, eventRuntime: fakeEventRuntime() });
  const mission = (await mr.getPending(5))[0];
  await scheduler._dispatch(mission);

  const after = (await mr.getPending(0)).length === 0
    ? null
    : null;
  const m = (await mr.getPending(0), await _findMission(mr, id));
  assert.notStrictEqual(m.status, 'completed',
    `failed mission must NOT be marked completed (was '${m.status}')`);
  assert.ok(['failed', 'retry_pending'].includes(m.status),
    `failed mission must be failed or retry_pending (was '${m.status}')`);
});

async function _findMission(mr, id) {
  // getTrace reads ping_events; read mission directly via internal mock query
  const res = await mr._pool.query('SELECT * FROM ping_missions WHERE mission_id = $1', [id]);
  return res.rows[0];
}

test('G1-T3: a second claim on an assigned mission is rejected (P0-1)', async () => {
  const { mr } = makeMr();
  const id = await mr.create('CUSTOMER_ONBOARD', { event_type: 'CUSTOMER_CREATED' });
  await mr.assign(id, 'scheduler-A');

  // P0-1: assign() must be a conditional transition — a second claim on the
  // same mission must be rejected. Today it is an unconditional UPDATE that
  // steals the assignment (scheduler-B overwrites scheduler-A), so this
  // assertion FAILS at the defect point.
  await mr.assign(id, 'scheduler-B');
  const m = await _findMission(mr, id);
  assert.strictEqual(m.assigned_to, 'scheduler-A',
    'second claim on same mission must be rejected (unconditional UPDATE steals it)');
});

// ─── G3: Durable retry (P0-4) ─────────────────────────────────────────

test('G3-T5: failWithRetry increments retries, sets retry_pending + retry_at, re-available after backoff', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('LEAD_FOLLOWUP', { event_type: 'LEAD_CREATED' });
  await mr.assign(id, 'observation');

  if (typeof mr.failWithRetry !== 'function') {
    throw new Error('P0-4 not implemented: MissionRuntime.failWithRetry() missing');
  }

  const backoff = 5000;
  await mr.failWithRetry(id, 'transient error', { max_attempts: 3, backoff_delay_ms: backoff });

  let m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'retry_pending', 'RETRY_PENDING');
  assert.strictEqual(m.retries, 1, 'retries incremented');
  assert.ok(new Date(m.retry_at).getTime() > Date.now(), 'retry_at is in the future (backoff gate)');
  assert.ok(m.error.includes('transient error'), 'error captured');

  // Not claimable before backoff elapses
  const duringBackoff = await mr.getPending(5);
  assert.strictEqual(duringBackoff.length, 0, 'not AVAILABLE during backoff');

  // Re-available after backoff
  m.retry_at = Date.now() - 1;
  const afterBackoff = await mr.getPending(5);
  assert.strictEqual(afterBackoff.length, 1, 're-enters AVAILABLE after backoff');
});

test('G3-T6: exhaustion (max_attempts reached) → status failed', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('INVOICE_FOLLOWUP', { event_type: 'INVOICE_SENT' });

  if (typeof mr.failWithRetry !== 'function') {
    throw new Error('P0-4 not implemented: MissionRuntime.failWithRetry() missing');
  }

  // Attempt 1 → retry_pending
  await mr.failWithRetry(id, 'e1', { max_attempts: 2, backoff_delay_ms: 10 });
  assert.strictEqual(pool._tables.ping_missions.find(m => m.mission_id === id).status, 'retry_pending');
  assert.strictEqual(pool._tables.ping_missions.find(m => m.mission_id === id).retries, 1);

  // Attempt 2 → retry_pending
  await mr.failWithRetry(id, 'e2', { max_attempts: 2, backoff_delay_ms: 10 });
  assert.strictEqual(pool._tables.ping_missions.find(m => m.mission_id === id).retries, 2);

  // Attempt 3 → exhausted → failed
  await mr.failWithRetry(id, 'e3', { max_attempts: 2, backoff_delay_ms: 10 });
  const m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'failed', 'exhausted mission FAILED');
});

// ─── G4: Durable DLQ (P0-5) ──────────────────────────────────────────

test('G4-T7: exhausted mission routes to a dead-letter store with mission fields', async () => {
  const { mr } = makeMr();
  const id = await mr.create('ESTIMATE_FOLLOWUP', { event_type: 'ESTIMATE_SENT', estimate_id: 'e9' });

  const wr = new WorkerRuntime();
  wr.register('observation', throwingWorker('permanent failure'), { eventTypes: ['ESTIMATE_SENT'] });

  const deadLetters = [];
  const dlq = {
    async recordDeadLetter(job, error) {
      deadLetters.push({ job, error: error.message });
      return `dl-${job.job_id}`;
    },
  };

  const scheduler = new MissionScheduler({
    missionRuntime: mr,
    workerRuntime: wr,
    eventRuntime: fakeEventRuntime(),
    deadLetterAuthority: dlq,          // P0-5 wiring point
    retryPolicy: { max_attempts: 1, backoff_delay_ms: 0 },  // P0-4 exhaustion on first failure
  });

  const mission = (await mr.getPending(5))[0];
  await scheduler._dispatch(mission);

  const m = await _findMission(mr, id);
  assert.notStrictEqual(m.status, 'completed', 'exhausted mission must not complete');
  assert.strictEqual(deadLetters.length, 1, 'dead letter recorded exactly once');
  assert.strictEqual(deadLetters[0].job.job_id, id, 'DLQ carries mission_id as original_job_id');
  assert.strictEqual(deadLetters[0].job.job_type, 'ESTIMATE_FOLLOWUP', 'DLQ carries mission_type');
  assert.ok(deadLetters[0].error.includes('permanent failure'), 'DLQ carries error');
});

// ─── G5: Lease + crash recovery (P0-6) ───────────────────────────────

test('G5-T8: expired lease on a RUNNING mission is NOT reaped to created (PARK/HOLD)', async () => {
  const { pool, mr } = makeMr();
  const id = await mr.create('PROJECT_CLOSEOUT', { event_type: 'PROJECT_COMPLETED' });
  await mr.assign(id, 'crashing-scheduler');
  await mr.start(id);

  let m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'running');

  // Simulate lease expiry
  m.lease_until = new Date(Date.now() - 5000).toISOString();

  if (typeof mr.reapExpiredLeases !== 'function') {
    throw new Error('P0-6 not implemented: MissionRuntime.reapExpiredLeases() missing');
  }

  // Constitutional PARK/HOLD (Nolan 2026-09-24): the running mission may have
  // produced an external effect. Lease expiry must NOT reset it to created —
  // that would be an automatic retry of an unknown-outcome execution. The
  // orphan escalator parks it as HOLD instead (proven by the retry_watchdog
  // PARK/HOLD chain tests).
  const reclaimed = await mr.reapExpiredLeases();
  assert.strictEqual(reclaimed, 0, 'running mission is never reaped to created');

  m = pool._tables.ping_missions.find(m => m.mission_id === id);
  assert.strictEqual(m.status, 'running', 'still running — NOT reclaimed to AVAILABLE');
  assert.ok(m.lease_until, 'lease retained — the orphan escalator needs it to detect the crash');

  // And it does NOT re-enter the claim pool
  const pending = await mr.getPending(5);
  assert.ok(!pending.some(p => p.mission_id === id), 'running mission does not re-enter claim pool');
});

run();
