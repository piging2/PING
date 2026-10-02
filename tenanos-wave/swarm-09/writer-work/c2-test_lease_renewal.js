/**
 * Arrow 0 Test — Lease Renewal Wiring
 *
 * Proves that MissionScheduler._poll() renews leases for missions in its
 * _processing set BEFORE calling reapExpiredLeases(), preventing the reaper
 * from resetting in-progress missions whose workers are slow.
 *
 * Key invariants tested:
 *  1. renewLease() is called for every mission in _processing during _poll()
 *  2. Renewed missions are NOT reaped (lease extended past original expiry)
 *  3. Missions NOT in _processing with expired leases ARE still reaped
 *  4. Renewal failure is non-fatal — poll continues and dispatch still works
 *  5. Stats track renewal count
 *  6. getStats() exposes renewal count
 *  7. Renewal extends lease even if original lease already expired
 *  8. P-09a (P-20260923-108): renewal is holder-bound — the scheduler passes
 *     the holder it claimed as; a foreign or missing holder fails closed (0)
 *  9. P-09b (P-20260923-106): dispatch aborts when assign() rowCount !== 1 —
 *     no start(), no worker dispatch, dropped from _processing (no claim
 *     stealing, no double execution)
 *
 * Mocks: MissionRuntime (in-memory with renewLease), WorkerRuntime (no-op).
 * No Postgres, no Docker.
 */

const assert = require('assert');
const { MissionScheduler } = require('../ping-runtime/orchestration/mission_scheduler');

// ─── Mock MissionRuntime with lease renewal tracking ─────────────────

class MockMissionRuntime {
  constructor() {
    this._missions = [];
    this._reapCalls = 0;
    this._reapedCount = 0;
    this._renewCalls = [];
    this._renewedIds = [];
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
   * Claim a mission. P-09b (P-20260923-106): faithful to the real SQL —
   * conditional on status='created'; returns rowCount 1 if claimed, 0 if
   * another scheduler already holds it.
   */
  async assign(missionId, worker) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    if (m.status !== 'created') return 0; // claim lost — already claimed
    m.status = 'assigned';
    m.assigned_to = worker;
    m.claimed_at = new Date().toISOString();
    m.lease_until = new Date(Date.now() + 30000).toISOString();
    return 1;
  }

  async start(missionId) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    m.status = 'running';
    m.started_at = new Date().toISOString();
  }

  async complete(missionId, result) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    m.status = 'completed';
    m.result = result;
    m.completed_at = new Date().toISOString();
  }

  async fail(missionId, error) {
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) throw new Error(`Mission ${missionId} not found`);
    m.status = 'failed';
    m.error = error;
  }

  async failWithRetry(missionId, error, options = {}) {
    await this.fail(missionId, error);
    return 1;
  }

  /**
   * Renew lease for a mission — extends lease_until by durationSeconds.
   * Only renews missions in 'running' or 'assigned' status.
   * P-09a (P-20260923-108): holder-bound — holder must match assigned_to,
   * mirroring the real SQL predicate `AND assigned_to = $holder`.
   */
  async renewLease(missionId, holder, durationSeconds = 60) {
    this._renewCalls.push({ missionId, holder });
    const m = this._missions.find(x => x.mission_id === missionId);
    if (!m) return 0;
    if (m.status !== 'running' && m.status !== 'assigned') return 0;
    if (!m.lease_until) return 0;
    if (!holder || m.assigned_to !== holder) return 0; // holder binding: fail closed
    // Extend lease from NOW, not from original lease_until
    m.lease_until = new Date(Date.now() + durationSeconds * 1000).toISOString();
    this._renewedIds.push(missionId);
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

/**
 * T1: renewLease is called for missions in _processing during _poll(),
 * WITH the holder the scheduler claimed as (P-09a holder binding).
 *
 * Setup: create 2 missions, dispatch one (enters _processing), then run
 * another _poll cycle. The mission in _processing should have renewLease
 * called on it before reapExpiredLeases runs.
 */
async function testRenewalCalledForProcessingMissions() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create first mission and dispatch it (enters _processing)
  const m1 = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await scheduler._poll();
  assert.strictEqual(runtime._renewCalls.length, 0, 'No renewals on first poll (nothing in _processing)');

  // The mission completed synchronously, so _processing is empty now.
  // Instead, test with a mission that stays running (worker doesn't complete).
  // Simulate: assign a mission directly, put it in _processing manually.
  const m2 = await runtime.create('OBSERVATION_CREATE', { event_type: 'CUSTOMER_CREATED' });
  await runtime.assign(m2.mission_id, 'observation');
  await runtime.start(m2.mission_id);
  // Inject into scheduler's _processing set (simulates a slow worker)
  scheduler._processing.set(m2.mission_id, 'observation');

  // Run another poll cycle
  runtime._renewCalls = [];
  await scheduler._poll();

  // renewLease should have been called for the mission in _processing,
  // WITH the holder the scheduler claimed as
  const renewCall = runtime._renewCalls.find(c => c.missionId === m2.mission_id);
  assert.ok(
    renewCall,
    `Expected renewLease called for ${m2.mission_id}, got calls: ${JSON.stringify(runtime._renewCalls)}`
  );
  assert.strictEqual(
    renewCall.holder, 'observation',
    `Expected holder 'observation' passed to renewLease, got '${renewCall.holder}'`
  );
  console.log('  PASS: renewLease called for missions in _processing (with holder)');
}

/**
 * T2: Renewed mission is NOT reaped even with originally-expired lease.
 *
 * Setup: assign a mission, set its lease to the past, inject into _processing,
 * run poll. The renewal should extend the lease BEFORE reap runs.
 */
async function testRenewedMissionNotReaped() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create and start a mission
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'observation');
  await runtime.start(mission.mission_id);

  // Force lease into the past (simulates slow worker)
  mission.lease_until = new Date(Date.now() - 5000).toISOString();

  // Inject into scheduler _processing (slow worker path)
  scheduler._processing.set(mission.mission_id, 'observation');

  // Run poll — renewal should extend lease BEFORE reap
  await scheduler._poll();

  // The mission should NOT be reaped — renewal extended its lease
  assert.strictEqual(mission.status, 'running', `Expected mission still 'running', got '${mission.status}'`);
  assert.strictEqual(runtime._reapedCount, 0, `Expected 0 reaped, got ${runtime._reapedCount}`);
  // Lease should now be in the future (renewed)
  assert.ok(
    new Date(mission.lease_until) > new Date(),
    'Expected lease_until extended to future after renewal'
  );
  console.log('  PASS: renewed mission not reaped');
}

/**
 * T3: Mission NOT in _processing with expired lease IS still reaped.
 *
 * Setup: orphan a mission (assign + start, set expired lease, NOT in _processing).
 * Run poll. Reaper should catch it.
 */
async function testOrphanedMissionStillReaped() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create orphaned mission (assigned+started, but NOT in scheduler _processing)
  const orphan = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(orphan.mission_id, 'observation');
  await runtime.start(orphan.mission_id);
  // Set expired lease — this is an orphan (crashed scheduler, no renewal)
  orphan.lease_until = new Date(Date.now() - 10000).toISOString();

  // Run poll
  await scheduler._poll();

  // The orphan should have been reaped (reapedCount confirms) AND
  // re-dispatched in the same poll cycle (reaped → created → dispatched → completed).
  assert.ok(runtime._reapedCount >= 1, `Expected >=1 reaped, got ${runtime._reapedCount}`);
  assert.strictEqual(orphan.status, 'completed', `Expected orphan re-dispatched to 'completed', got '${orphan.status}'`);
  console.log('  PASS: orphaned mission reaped + re-dispatched');
}

/**
 * T4: Renewal failure is non-fatal — poll continues.
 *
 * Setup: inject mission into _processing, make renewLease throw.
 * Poll should not throw and dispatch should still work.
 */
async function testRenewalFailureNonFatal() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Inject a mission into _processing
  const m = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(m.mission_id, 'observation');
  await runtime.start(m.mission_id);
  scheduler._processing.set(m.mission_id, 'observation');

  // Make renewLease throw
  const origRenew = runtime.renewLease.bind(runtime);
  runtime.renewLease = async () => { throw new Error('PG connection lost'); };

  // Create a fresh pending mission
  const fresh = await runtime.create('OBSERVATION_CREATE', { event_type: 'CUSTOMER_CREATED' });

  // Poll should NOT throw — renewal failure is non-fatal
  let threw = false;
  try {
    await scheduler._poll();
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, 'Poll should not throw on renewal failure');

  // The fresh mission should still be dispatched
  assert.strictEqual(worker._dispatched.length, 1, `Expected 1 dispatch despite renewal failure, got ${worker._dispatched.length}`);

  // Restore
  runtime.renewLease = origRenew;
  console.log('  PASS: renewal failure is non-fatal');
}

/**
 * T5: Stats track renewal count correctly.
 *
 * Setup: inject 2 missions into _processing, run poll. Renewal count
 * should reflect the number of successfully renewed missions.
 */
async function testRenewalStatsTracking() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create 2 missions and inject into _processing
  const m1 = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(m1.mission_id, 'observation');
  await runtime.start(m1.mission_id);
  scheduler._processing.set(m1.mission_id, 'observation');

  const m2 = await runtime.create('OBSERVATION_CREATE', { event_type: 'CUSTOMER_CREATED' });
  await runtime.assign(m2.mission_id, 'observation');
  await runtime.start(m2.mission_id);
  scheduler._processing.set(m2.mission_id, 'observation');

  // Run poll
  await scheduler._poll();

  // Stats should show 2 renewals
  const stats = scheduler.getStats();
  assert.strictEqual(stats.renewals, 2, `Expected 2 renewals in stats, got ${stats.renewals}`);
  console.log('  PASS: renewal stats tracked correctly');
}

/**
 * T6: getStats() exposes renewals field.
 */
async function testGetStatsExposesRenewals() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
  });

  const stats = scheduler.getStats();
  assert.ok('renewals' in stats, 'getStats() must include renewals field');
  assert.strictEqual(stats.renewals, 0, 'Initial renewals should be 0');
  console.log('  PASS: getStats() exposes renewals field');
}

/**
 * T7: Renewal extends lease even if original lease already expired.
 *
 * This tests the critical scenario: worker is slow, lease expired,
 * but scheduler is still processing. Renewal should rescue it from reaping.
 */
async function testRenewalRescuesExpiredLease() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Create mission with deeply expired lease
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'observation');
  await runtime.start(mission.mission_id);
  mission.lease_until = new Date(Date.now() - 60000).toISOString(); // expired 60s ago

  // Inject into _processing (scheduler thinks it's still working)
  scheduler._processing.set(mission.mission_id, 'observation');

  // Run poll — Arrow 0 renews, Arrow 1 reaps
  await scheduler._poll();

  // Mission should survive — renewal extended lease from NOW (+60s)
  assert.strictEqual(mission.status, 'running', `Expected mission rescued by renewal, got '${mission.status}'`);
  assert.strictEqual(runtime._reapedCount, 0, `Expected 0 reaped after renewal rescue, got ${runtime._reapedCount}`);

  // Verify lease is now well in the future
  const leaseFuture = new Date(mission.lease_until).getTime() - Date.now();
  assert.ok(leaseFuture > 50000, `Expected lease ~60s in future, got ${leaseFuture}ms`);
  console.log('  PASS: renewal rescues expired lease from reaping');
}

/**
 * T8 (P-09a / P-20260923-108): renewal with a foreign or missing holder is
 * rejected — fail closed, lease untouched.
 *
 * A scheduler instance must not be able to extend another holder's lease;
 * otherwise a crashed scheduler's orphan could have its lease propped up by
 * a foreign renewal, defeating reapExpiredLeases() orphan recovery.
 */
async function testForeignHolderRenewalRejected() {
  const runtime = new MockMissionRuntime();
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'observation');
  await runtime.start(mission.mission_id);

  const leaseBefore = mission.lease_until;

  // Foreign holder renewal — must fail closed
  const renewedForeign = await runtime.renewLease(mission.mission_id, 'intruder');
  assert.strictEqual(renewedForeign, 0, 'Foreign-holder renewal must return 0');
  assert.strictEqual(mission.lease_until, leaseBefore, 'Foreign renewal must not touch lease_until');

  // Missing holder renewal — must fail closed
  const renewedNone = await runtime.renewLease(mission.mission_id);
  assert.strictEqual(renewedNone, 0, 'Holder-less renewal must return 0');
  assert.strictEqual(mission.lease_until, leaseBefore, 'Holder-less renewal must not touch lease_until');

  // Rightful holder renewal — succeeds
  const renewedOwner = await runtime.renewLease(mission.mission_id, 'observation');
  assert.strictEqual(renewedOwner, 1, 'Rightful-holder renewal must return 1');
  assert.ok(new Date(mission.lease_until) > new Date(leaseBefore), 'Rightful renewal must extend lease_until');

  console.log('  PASS: foreign-holder renewal rejected (fail closed)');
}

/**
 * T9 (P-09b / P-20260923-106): dispatch aborts when the claim is lost.
 *
 * If assign() returns rowCount !== 1 (another scheduler won the claim race),
 * the scheduler must NOT call start(), must NOT dispatch to the worker, and
 * must drop the mission from _processing. Prevents claim stealing and the
 * resulting double execution.
 */
async function testClaimConflictAbortsDispatch() {
  const runtime = new MockMissionRuntime();
  const worker = new MockWorkerRuntime();
  const scheduler = new MissionScheduler({
    missionRuntime: runtime,
    workerRuntime: worker,
    pollIntervalMs: 100000,
    maxConcurrent: 5,
  });

  // Another scheduler already claimed this mission (simulates our claim
  // losing the race: by the time WE try, status is no longer 'created').
  const mission = await runtime.create('OBSERVATION_CREATE', { event_type: 'REVIEW_RECEIVED' });
  await runtime.assign(mission.mission_id, 'other-scheduler');

  // Dispatch directly — our assign() will return rowCount 0
  await scheduler._dispatch(mission);

  // The worker must NEVER have run (no double execution)
  assert.strictEqual(worker._dispatched.length, 0, 'Worker must not run when the claim is lost');
  // The mission must not have been started/completed by us
  assert.strictEqual(mission.status, 'assigned', `Mission must stay 'assigned' (winner's), got '${mission.status}'`);
  assert.strictEqual(mission.assigned_to, 'other-scheduler', "assigned_to must still be the winning holder's");
  // Dropped from _processing (finally block)
  assert.ok(!scheduler._processing.has(mission.mission_id), 'Mission must be dropped from _processing');
  // Conflict counted for observability
  assert.strictEqual(scheduler.getStats().claim_conflicts, 1, 'claim_conflicts stat must be 1');

  console.log('  PASS: claim conflict aborts dispatch (no steal, no double-execution)');
}

// ─── Run ─────────────────────────────────────────────────────────────

async function run() {
  console.log('Arrow 0: Lease Renewal Wiring');
  console.log('─'.repeat(50));

  const tests = [
    testRenewalCalledForProcessingMissions,
    testRenewedMissionNotReaped,
    testOrphanedMissionStillReaped,
    testRenewalFailureNonFatal,
    testRenewalStatsTracking,
    testGetStatsExposesRenewals,
    testRenewalRescuesExpiredLease,
    testForeignHolderRenewalRejected,
    testClaimConflictAbortsDispatch,
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
