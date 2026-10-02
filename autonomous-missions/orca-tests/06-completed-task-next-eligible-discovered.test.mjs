/**
 * INVARIANT 06 — completed task → next eligible task discovered
 * ============================================================
 * GROUNDING: SNAPSHOT-VERIFIED.
 *   API: MissionRuntime.create/assign/start/complete/getPending
 *   (pig-src snapshot 2026-09-19; canonical path
 *   ping-runtime/orchestration/mission_runtime.js).
 *
 * INVARIANT: discovery is priority-ordered, claim-atomic, and monotonic:
 *   (a) getPending() returns claimable missions ordered by priority DESC,
 *       created_at ASC;
 *   (b) claiming is atomic — two racers for the same mission produce
 *       exactly one winner (conditional UPDATE, loser gets rowCount 0);
 *   (c) completing a mission advances discovery: the next poll surfaces
 *       the next eligible mission, and completed missions never resurface.
 *
 * ORCA RELEVANCE: Orca documents "agents pick up work as upstream runs
 * complete" but implements no discovery and no claiming — List(Filter)
 * is a listing, and the Pickup event has no code behind it. This draft
 * encodes the CRX discovery+claim loop Orca lacks. The dependency-aware
 * variant of "eligible" (all deps completed) is INVENTION_REQUIRED —
 * see 03-dependency-incomplete-dependent-blocked.test.mjs.
 *
 * Run: node --test 06-completed-task-next-eligible-discovered.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeEventRecorder, uniqueType,
  makeRuntime, completedOk, cleanupMissions,
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

test('discovery is priority-ordered and monotonic across completions', async () => {
  const rt = await makeRuntime(pool, null);
  const base = uniqueType('discover');

  // Create out of priority order to prove discovery sorts, not insertion order.
  const low = await rt.create(base, { event_id: 'e-low' }, { createdBy: 'test-06', priority: 1 });
  const high = await rt.create(base, { event_id: 'e-high' }, { createdBy: 'test-06', priority: 5 });
  const mid = await rt.create(base, { event_id: 'e-mid' }, { createdBy: 'test-06', priority: 3 });
  created.push(low, high, mid);

  let pending = await rt.getPending(10);
  assert.deepEqual(
    pending.map((m) => m.mission_id),
    [high, mid, low],
    'discovery order is priority DESC'
  );

  // Drain the queue through the full lifecycle; each completion must
  // advance discovery to the next eligible mission.
  const seen = [];
  for (const expected of [high, mid, low]) {
    pending = await rt.getPending(10);
    assert.equal(pending[0].mission_id, expected, `next eligible is ${expected}`);
    assert.equal(await rt.assign(expected, 'worker'), 1, 'atomic claim wins');
    assert.equal(await rt.start(expected, 'worker'), 1);
    assert.ok(completedOk(await rt.complete(expected, { ok: true })));
    seen.push(expected);
  }
  assert.deepEqual(seen, [high, mid, low], 'every mission completed exactly once, in priority order');

  pending = await rt.getPending(10);
  assert.equal(pending.length, 0, 'completed missions never resurface in discovery');
});

test('concurrent claim race: exactly one winner, loser sees rowCount 0', async () => {
  const events = makeEventRecorder();
  const rt = await makeRuntime(pool, events);
  const m = await rt.create(uniqueType('race'), { event_id: 'e-race' }, { createdBy: 'test-06' });
  created.push(m);

  // Two schedulers (or two poll cycles) race the same pending mission.
  const [r1, r2] = await Promise.all([rt.assign(m, 'sched-a'), rt.assign(m, 'sched-b')]);
  assert.equal(r1 + r2, 1, 'exactly one claim wins the race');

  const winner = r1 === 1 ? 'sched-a' : 'sched-b';
  assert.equal(events.ofType('MISSION_ASSIGNED').length, 1, 'one MISSION_ASSIGNED event');
  assert.equal(events.ofType('MISSION_ASSIGNED')[0].payload.assignedTo, winner);

  // The loser must not be able to start or advance the mission.
  const loser = winner === 'sched-a' ? 'sched-b' : 'sched-a';
  assert.equal(await rt.start(m, loser), 0, 'loser cannot start the mission');

  await rt.start(m, winner);
  assert.ok(completedOk(await rt.complete(m, { ok: true })));
});

test('failed-with-retry missions re-enter discovery only when due', async () => {
  const rt = await makeRuntime(pool, null);
  const m = await rt.create(uniqueType('retryq'), { event_id: 'e-retry' }, { createdBy: 'test-06' });
  created.push(m);

  await rt.assign(m, 'worker');
  await rt.start(m, 'worker');
  // Backoff far in the future: the mission must NOT be discoverable yet.
  await rt.failWithRetry(m, 'boom', { max_attempts: 3, backoff_delay_ms: 60 * 60 * 1000 });

  let pending = await rt.getPending(10);
  assert.ok(!pending.map((x) => x.mission_id).includes(m), 'not-due retry is not discoverable');

  // Test-only: make the retry due, reclaim, and confirm rediscovery.
  await pool.query(`UPDATE ping_missions SET retry_at = NOW() - INTERVAL '1 second' WHERE mission_id = $1`, [m]);
  assert.equal(await rt.reclaimRetryPending(), 1, 'due retry reclaimed to created');
  pending = await rt.getPending(10);
  assert.ok(pending.map((x) => x.mission_id).includes(m), 'due retry re-enters discovery');

  // And it goes through the atomic claim lifecycle again (retries increment
  // toward exhaustion — the O3 hot-loop repair).
  assert.equal(await rt.assign(m, 'worker'), 1);
});
