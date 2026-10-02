/**
 * INVARIANT 05 — coordinator restarts → task graph reconstructed
 * ============================================================
 * GROUNDING: SNAPSHOT-VERIFIED.
 *   API: MissionRuntime.assign/start/renewLease/reapExpiredLeases/
 *        getPending/getActive/getStats (pig-src snapshot 2026-09-19;
 *   canonical path ping-runtime/orchestration/mission_runtime.js).
 *   The scheduler's `_processing` Set is session-only (mission_scheduler.js
 *   in the same snapshot) — this test proves the durable lease, not the
 *   ephemeral Set, is the source of truth across restarts.
 *
 * INVARIANT: a coordinator restart loses nothing but in-memory state.
 * Missions the dead scheduler had claimed are NOT stuck: their leases
 * stop being renewed, the reaper reclaims them, and a fresh scheduler
 * instance rediscovers them via getPending(). The reconstructed graph
 * is consistent: no mission is simultaneously "in progress" and
 * "claimable", and no mission is lost.
 *
 * ORCA RELEVANCE: Orca's rehydration story is README-only ("Surviving
 * Context Loss" calls MCP tools that don't exist). This draft encodes
 * the CRX mechanism that actually delivers restart survival: durable
 * leases + reaper + priority-ordered discovery.
 *
 * Run: node --test 05-coordinator-restart-graph-reconstructed.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeEventRecorder, uniqueType,
  makeRuntime, completedOk, expireLeaseNow, cleanupMissions,
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

test('restarted coordinator recovers in-flight missions via lease expiry', async () => {
  const events = makeEventRecorder();

  // --- "Scheduler instance 1": claims two missions, then dies. ---
  // Its _processing Set (ephemeral) dies with it; only the rows remain.
  const rt1 = await makeRuntime(pool, events);
  const t1 = uniqueType('restart');
  const m1 = await rt1.create(t1, { event_id: 'evt-r1' }, { createdBy: 'test-05' });
  const m2 = await rt1.create(t1, { event_id: 'evt-r2' }, { createdBy: 'test-05' });
  created.push(m1, m2);
  assert.equal(await rt1.assign(m1, 'sched-1-worker'), 1);
  assert.equal(await rt1.start(m1, 'sched-1-worker'), 1);
  assert.equal(await rt1.assign(m2, 'sched-1-worker'), 1);
  // m2 stays `assigned` (claimed but never started) — also must recover.
  // Scheduler 1 dies here: no more renewLease calls, no completion.

  // --- Time passes: both leases expire (test-only clock travel). ---
  await expireLeaseNow(pool, m1);
  await expireLeaseNow(pool, m2);

  // --- "Scheduler instance 2": fresh MissionRuntime, empty memory. ---
  // Its first poll runs the Arrow 0/1/1b sequence: renew (nothing to
  // renew), reap expired leases, reclaim retries.
  const rt2 = await makeRuntime(pool, events);
  const reclaimed = await rt2.reapExpiredLeases();
  assert.equal(reclaimed, 2, 'both orphaned missions reclaimed after restart');

  // --- Graph reconstruction: the fresh scheduler rediscovers the work. ---
  const pending = await rt2.getPending(10);
  const pendingIds = pending.map((m) => m.mission_id);
  assert.ok(pendingIds.includes(m1), 'm1 rediscovered as pending');
  assert.ok(pendingIds.includes(m2), 'm2 rediscovered as pending');

  const active = await rt2.getActive();
  assert.equal(active.length, 0, 'nothing is stuck in assigned/running after recovery');

  const stats = await rt2.getStats();
  assert.equal(stats.created, 2, 'stats show two claimable missions');
  assert.ok(!stats.running && !stats.assigned, 'no phantom in-progress missions');

  // --- Fresh claims proceed; each mission completes exactly once. ---
  for (const mid of [m1, m2]) {
    assert.equal(await rt2.assign(mid, 'sched-2-worker'), 1, `${mid} claimed by new scheduler`);
    assert.equal(await rt2.start(mid, 'sched-2-worker'), 1);
    assert.ok(completedOk(await rt2.complete(mid, { recovered: true })));
  }
  assert.equal(events.ofType('MISSION_COMPLETED').length, 2, 'each mission completed exactly once');
  assert.equal(events.ofType('MISSION_LEASE_EXPIRED').length, 2, 'one lease-expired event per orphan');
});

test('missions that completed before the crash are never rediscovered', async () => {
  const rt = await makeRuntime(pool, null);
  const t = uniqueType('restart_done');
  const m = await rt.create(t, { event_id: 'evt-done' }, { createdBy: 'test-05' });
  created.push(m);

  await rt.assign(m, 'worker');
  await rt.start(m, 'worker');
  assert.ok(completedOk(await rt.complete(m, { ok: true })));

  // A fresh scheduler instance after a hypothetical crash:
  const rt2 = await makeRuntime(pool, null);
  await rt2.reapExpiredLeases();
  const pending = await rt2.getPending(10);
  assert.ok(
    !pending.map((x) => x.mission_id).includes(m),
    'completed missions are never resurrected by recovery'
  );
});
