/**
 * Arrow 1 Test — Lease Reaping Wiring
 *
 * Proves that MissionScheduler._poll() calls reapExpiredLeases() before
 * fetching pending missions, turning expired-lease missions back to created
 * so they can be re-dispatched.
 *
 * Mocks: MissionRuntime (in-memory), WorkerRuntime (no-op dispatch).
 * No Postgres, no Docker.
 */

const assert = require('assert');
const { MissionScheduler } = require('../ping-runtime/orchestration/mission_scheduler');

// ─── Mock MissionRuntime ─────────────────────────────────────────────

class MockMissionRuntime {
  constructor() {
    this._missions = [];
    this._reapCalls = 0;
    this._reapedCount = 0;
  }

  async create(missionType, payload, options = {}) {
    const mission = {
      mission_id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mission_type: missionType,
      payload: JSON.stringify(payload),
      priority: options.priority || 0,
      status: 'created',
      assigned_to: null,
      claimed_at: null,
      lease_until: null,
      fencing_token: null, // P-09c (P-20260923-107): minted per claim, cleared on reap
      retries: 0,
      error: null,
      result: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };
    this._missions.push(mission);
    return mission;
  }

  async getPending(limit) {
    return this._missions
      .filter(m => m.status === 'created')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  /**
   * Claim a mission. P-09b (P-20260923-106): conditional on status='created',
   * returns rowCount 1 (claimed) or 0 (claim lost). P-09c (P-20260923-107):
   * mints a fresh fencing token per successful claim.
   */
  async assign(missionId, worker) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    if (m.status !== 'created') return { rowCount: 0, fencingToken: null }; // claim lost
    const fencingToken = `token_${missionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    m.status = 'assigned';
    m.assigned_to = worker;
    m.claimed_at = new Date().toISOString();
    m.lease_until = new Date(Date.now() + 30000).toISOString();
    m.fencing_token = fencingToken;
    return { rowCount: 1, fencingToken };
  }

  async start(missionId) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    m.status = 'running';
    m.started_at = new Date().toISOString();
  }

  /**
   * P-09c (P-20260923-107): fencing-token guarded — the presented token must
   * match the claim-issued token, mirroring the real SQL predicate. A stale
   * token fails closed (no state change).
   */
  async complete(missionId, result, options = {}) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    if (m.status !== 'running') return 0;
    if (m.fencing_token !== options.fencingToken) return 0; // stale token: fail closed
    m.status = 'completed';
    m.result = result;
    m.completed_at = new Date().toISOString();
    return 1;
  }

  async fail(missionId, error, options = {}) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    if (m.fencing_token !== options.fencingToken) return 0; // stale token: fail closed
    m.status = 'failed';
    m.error = error;
    return 1;
  }

  async failWithRetry(missionId, error, options = {}) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    if (m.fencing_token !== options.fencingToken) return m.retries; // stale token: fail closed
    await this.fail(missionId, error, options);
    return 1;
  }

  /**
   * Simulates reapExpiredLeases — counts calls and actually reaps.
   */
  async reapExpiredLeases() {
    this._reapCalls++;
    const now = new Date();
    let count = 0;
    for (const m of this._missions) {
      if ((m.status === 'assigned' || m.status === 'running') && m.lease_until) {
        if (new Date(m.lease_until) < now) {
          m.status = 'created';
          m.assigned_to = null;
          m.claimed_at = null;
          m.lease_until = null;
          m.fencing_token = null; // P-09c: token cleared on reclaim
          count++;
        }
      }
    }
    this._reapedCount += count;
    return count;
  }

  async getActive() {
    return this._missions.filter(m => m.status === 'assigned' || m.status === 'running');
  }

  async getStats() {
    const byStatus = {};
    for (const m of this._missions) {
      byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    }
    return { total: this._missions.length, byStatus };
  }
}

// ─── Mock WorkerRuntime ──────────────────────────────────────────────

class MockWorkerRuntime {
  constructor() {
    this._dispatched = [];
    this._workers = { observation: { status: 'idle', processed: 0 } };
  }

  getStats() {
    return { workers: this._workers, status: 'ok', running: 0, processed: 0, failed: 0 };
  }

  async dispatch(event) {
    this._dispatched.push(event);
    return { status: 'ok', worker: event.metadata?.assigned_to || 'observation' };
  }
}

// ─── Tests ───────────────────────────────────────────────────────────

async function testLeaseReapingIsCalledDuringPoll() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000, // won't tick — manual _poll only
    maxConcurrent: 5,
  });

  // Create a mission so poll has something to do
  await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });

  // Run one poll cycle
  await scheduler._poll();

  // reapExpiredLeases should have been called once
  assert.strictEqual(runtime._reapCalls, 1, `Expected 1 reap call, got ${runtime._reapCalls}`);
  console.log('  PASS: reapExpiredLeases called during _poll()');
}

async function testExpiredLeasesAreReapedBeforeDispatch() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create a mission and manually assign it with an expired lease
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'observation');
  // Force lease into the past
  mission.lease_until = new Date(Date.now() - 10000).toISOString();
  mission.status = 'assigned';

  // Also create a fresh pending mission
  const fresh = await runtime.create('OBSERVATION_CREATE', { event_type: 'CUSTOMER_CREATED' });

  // Run one poll cycle
  await scheduler._poll();

  // The expired-lease mission was reaped → re-dispatched → completed in one poll cycle.
  // Without reaping, the mission would stay 'assigned' forever (getPending only returns 'created').
  // Verify the full chain: reap + re-dispatch + complete.
  assert.strictEqual(runtime._reapCalls, 1, `Expected 1 reap call, got ${runtime._reapCalls}`);
  assert.ok(
    mission.status === 'completed',
    `Expected reaped mission re-dispatched to 'completed', got '${mission.status}'`
  );

  // Both missions should have been dispatched (reaped one re-dispatched + fresh one)
  assert.ok(worker._dispatched.length >= 2, `Expected >=2 dispatches, got ${worker._dispatched.length}`);
  console.log('  PASS: expired lease reaped → mission re-dispatched');
}

async function testReapingFailureDoesNotBlockPoll() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();

  // Override reapExpiredLeases to throw
  runtime.reapExpiredLeases = async () => { throw new Error('PG connection lost'); };

  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create a pending mission
  await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });

  // Poll should NOT throw — reaping failure is non-fatal
  let threw = false;
  try {
    await scheduler._poll();
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, 'Poll should not throw on reaping failure');

  // The pending mission should still be dispatched despite reaping failure
  assert.strictEqual(worker._dispatched.length, 1, `Expected 1 dispatch despite reap failure, got ${worker._dispatched.length}`);
  console.log('  PASS: reaping failure does not block poll/dispatch');
}

async function testActiveLeasesAreNotReaped() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create a mission with a FUTURE lease (not expired)
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'observation');
  mission.lease_until = new Date(Date.now() + 30000).toISOString(); // 30s from now
  mission.status = 'assigned';

  // Run poll
  await scheduler._poll();

  // The active mission should NOT be reaped
  assert.strictEqual(mission.status, 'assigned', `Expected active mission still 'assigned', got '${mission.status}'`);
  assert.strictEqual(mission.assigned_to, 'observation', 'Expected assigned_to preserved');
  assert.strictEqual(runtime._reapedCount, 0, `Expected 0 reaped, got ${runtime._reapedCount}`);
  console.log('  PASS: active (non-expired) leases not reaped');
}

// ─── Run ─────────────────────────────────────────────────────────────

async function run() {
  console.log('Arrow 1: Lease Reaping Wiring');
  console.log('─'.repeat(50));

  const tests = [
    testLeaseReapingIsCalledDuringPoll,
    testExpiredLeasesAreReapedBeforeDispatch,
    testReapingFailureDoesNotBlockPoll,
    testActiveLeasesAreNotReaped,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      failed++;
      console.error(`  FAIL: ${test.name}: ${err.message}`);
    }
  }

  console.log('─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
