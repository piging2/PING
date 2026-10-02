/**
 * INVARIANT 01 — worker dies → mission survives
 * ============================================================
 * GROUNDING: SNAPSHOT-VERIFIED.
 *   API: MissionRuntime.create/assign/start/complete, renewLease,
 *        reapExpiredLeases (pig-src snapshot 2026-09-19, matches the
 *   2026-09-22 crx-audit's file:line evidence for the live repo).
 *   Canonical path: ping-runtime/orchestration/mission_runtime.js
 *   Re-verify against /home/nolan/ping HEAD before CI promotion
 *   (path not mounted in the authoring sandbox).
 *
 * INVARIANT: a worker that dies mid-mission (no completion, no lease
 * renewal, no explicit failure) must not take the mission with it. The
 * mission row survives in the database; once its lease expires, the
 * reaper returns it to `created` and a different worker can claim and
 * complete it exactly once.
 *
 * ORCA RELEVANCE: Orca's run row survives worker death, but nothing in
 * Orca detects the death or reclaims the run (no reaper, no lease, no
 * watchdog). This draft encodes the CRX mechanism that closes the gap.
 *
 * Run: node --test 01-worker-dies-mission-survives.test.mjs
 * Needs: CRX_REPO set, `pg` installed, scratch PG database (see harness.mjs).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeEventRecorder, uniqueType,
  makeRuntime, completedOk, expireLeaseNow, getStatus, cleanupMissions,
} from './harness.mjs';

let pool;
const created = [];

before(async () => {
  pool = makePool();
  await assertScratchDb(pool);
});

after(async () => {
  await cleanupMissions(pool, created).catch(() => {});
  await pool.end();
});

test('worker dies mid-mission: lease expires, reaper reclaims, new worker completes exactly once', async () => {
  const events = makeEventRecorder();
  const rt = await makeRuntime(pool, events);
  const type = uniqueType('worker_dies');

  // Worker A claims and starts the mission, then "dies": no renewal,
  // no completion, no failure report. The scheduler's _processing entry
  // is gone with it (ephemeral Set) — only the durable row + lease remain.
  const missionId = await rt.create(type, { event_id: 'evt-1', goal: 'do the thing' }, { createdBy: 'test-01' });
  created.push(missionId);
  assert.equal(await rt.assign(missionId, 'worker-a'), 1, 'worker-a wins the atomic claim');
  assert.equal(await rt.start(missionId, 'worker-a'), 1, 'worker-a starts');

  // Simulate death: fast-forward the lease clock (test-only time travel).
  await expireLeaseNow(pool, missionId);

  // A live scheduler would keep renewing (Arrow 0). Nobody renews: the
  // worker is dead. The reaper (Arrow 1) must reclaim the orphan.
  const reclaimed = await rt.reapExpiredLeases();
  assert.equal(reclaimed, 1, 'exactly one orphaned lease reclaimed');

  const row = await getStatus(pool, missionId);
  assert.equal(row.status, 'created', 'mission is claimable again');
  assert.equal(row.assigned_to, null, 'stale worker binding cleared');

  const leaseExpiredEvents = events.ofType('MISSION_LEASE_EXPIRED');
  assert.equal(leaseExpiredEvents.length, 1, 'MISSION_LEASE_EXPIRED emitted once');
  assert.equal(leaseExpiredEvents[0].payload.missionId, missionId);

  // Worker B picks up the surviving mission and completes it.
  assert.equal(await rt.assign(missionId, 'worker-b'), 1, 'worker-b claims the reclaimed mission');
  assert.equal(await rt.start(missionId, 'worker-b'), 1, 'worker-b starts');
  assert.ok(completedOk(await rt.complete(missionId, { worker: 'worker-b' })), 'worker-b completes');

  const completedEvents = events.ofType('MISSION_COMPLETED');
  assert.equal(completedEvents.length, 1, 'exactly one MISSION_COMPLETED emitted');

  const final = await getStatus(pool, missionId);
  assert.equal(final.status, 'completed', 'mission ends completed, not lost');
});

test('dead worker cannot complete after reclaim: stale completion is a no-op', async () => {
  const rt = await makeRuntime(pool, null);
  const type = uniqueType('worker_dies_stale');

  const missionId = await rt.create(type, { event_id: 'evt-2' }, { createdBy: 'test-01' });
  created.push(missionId);
  await rt.assign(missionId, 'worker-a');
  await rt.start(missionId, 'worker-a');
  await expireLeaseNow(pool, missionId);
  await rt.reapExpiredLeases(); // mission back to created

  // The dead worker's late completion attempt must not resurrect or
  // corrupt the reclaimed mission: complete() only matches status='running'.
  const res = await rt.complete(missionId, { worker: 'worker-a', late: true });
  assert.ok(!completedOk(res), 'stale completion matches zero rows');

  const row = await getStatus(pool, missionId);
  assert.equal(row.status, 'created', 'mission still claimable, not phantom-completed');
});
