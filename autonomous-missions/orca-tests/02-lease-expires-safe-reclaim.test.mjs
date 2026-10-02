/**
 * INVARIANT 02 — task lease expires → safe reclaim
 * ============================================================
 * GROUNDING: SNAPSHOT-VERIFIED.
 *   API: MissionRuntime.assign/renewLease/reapExpiredLeases (pig-src
 *   snapshot 2026-09-19; canonical path
 *   ping-runtime/orchestration/mission_runtime.js).
 *
 * INVARIANT: lease expiry is the death detector. Reclaim must be SAFE:
 *   (a) only truly orphaned missions are reclaimed (a live worker that
 *       keeps renewing is never touched);
 *   (b) reclaim resets the full claim state (status, assigned_to,
 *       lease_until, claimed_at) so the next claim starts clean;
 *   (c) reclaim is idempotent — a second reaper pass finds nothing;
 *   (d) the superseded worker's late writes cannot corrupt the mission.
 *
 * ORCA RELEVANCE: Orca has no leases at all — no claiming code, no
 * expiry, no reclaim. The `Pickup` event exists in the transition table
 * but nothing performs it. This draft encodes the mechanism Orca lacks.
 *
 * Run: node --test 02-lease-expires-safe-reclaim.test.mjs
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

test('live worker that renews is never reclaimed', async () => {
  const rt = await makeRuntime(pool, null);
  const type = uniqueType('lease_live');

  const missionId = await rt.create(type, { event_id: 'evt-live' }, { createdBy: 'test-02' });
  created.push(missionId);
  await rt.assign(missionId, 'worker-live');
  await rt.start(missionId, 'worker-live');

  // The worker is alive: it renews its lease (what the scheduler's
  // Arrow 0 does every poll for _processing missions).
  assert.equal(await rt.renewLease(missionId, 60), 1, 'renewal accepted while running');

  const reclaimed = await rt.reapExpiredLeases();
  assert.equal(reclaimed, 0, 'reaper touches nothing while the lease is fresh');

  const row = await getStatus(pool, missionId);
  assert.equal(row.status, 'running', 'mission still running under its live worker');
  assert.equal(row.assigned_to, 'worker-live', 'worker binding intact');

  await rt.complete(missionId, { ok: true });
});

test('expired lease reclaims cleanly and exactly once', async () => {
  const events = makeEventRecorder();
  const rt = await makeRuntime(pool, events);
  const type = uniqueType('lease_expire');

  const missionId = await rt.create(type, { event_id: 'evt-exp' }, { createdBy: 'test-02' });
  created.push(missionId);
  await rt.assign(missionId, 'worker-gone');
  await rt.start(missionId, 'worker-gone');
  await expireLeaseNow(pool, missionId);

  assert.equal(await rt.reapExpiredLeases(), 1, 'one expired lease reclaimed');
  assert.equal(await rt.reapExpiredLeases(), 0, 'reclaim is idempotent: second pass finds nothing');

  const row = await pool.query(
    `SELECT status, assigned_to, lease_until, claimed_at, retry_at
       FROM ping_missions WHERE mission_id = $1`,
    [missionId]
  );
  const m = row.rows[0];
  assert.equal(m.status, 'created');
  assert.equal(m.assigned_to, null, 'stale binding cleared');
  assert.equal(m.lease_until, null, 'stale lease cleared');
  assert.equal(m.claimed_at, null, 'stale claim timestamp cleared');
  assert.ok(m.retry_at, 'retry_at set so the mission re-enters promptly');

  assert.equal(events.ofType('MISSION_LEASE_EXPIRED').length, 1, 'one MISSION_LEASE_EXPIRED event');

  // The reclaimed mission goes through the full atomic claim lifecycle again.
  assert.equal(await rt.assign(missionId, 'worker-next'), 1, 'fresh claim succeeds');
  assert.equal(await rt.assign(missionId, 'worker-race'), 0, 'concurrent second claim loses');
  await rt.start(missionId, 'worker-next');
  assert.ok(completedOk(await rt.complete(missionId, { ok: true })), 'completes once');
  assert.equal(events.ofType('MISSION_COMPLETED').length, 1, 'exactly one completion event');
});

test('reaper ignores missions that were never leased', async () => {
  const rt = await makeRuntime(pool, null);
  const type = uniqueType('lease_never');

  // A mission in `created` never had a lease; the reaper's WHERE clause
  // requires lease_until IS NOT NULL — it must not touch it.
  const missionId = await rt.create(type, { event_id: 'evt-never' }, { createdBy: 'test-02' });
  created.push(missionId);

  assert.equal(await rt.reapExpiredLeases(), 0, 'unleased missions are not reaped');
  const row = await getStatus(pool, missionId);
  assert.equal(row.status, 'created');
});
