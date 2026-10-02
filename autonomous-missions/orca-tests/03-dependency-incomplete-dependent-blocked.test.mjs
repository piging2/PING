/**
 * INVARIANT 03 — dependency incomplete → dependent task cannot run
 * ============================================================
 * GROUNDING: DRAFT-UNGROUNDED.
 *   No dependency API exists in the CRX runtime (verified: the pig-src
 *   2026-09-19 snapshot and the 2026-09-22 crx-audit show no depends_on
 *   table, no ready-set query, no DAG gating). Orca has the edge TABLE
 *   (run_dependencies DDL) but zero code that reads it — no ready-set
 *   query, no cycle detection, not even a self-dependency CHECK.
 *   This draft therefore PROPOSES the interface it tests:
 *     runtime.addDependency(runId, depId)   — rejects cycles + self-edges
 *     runtime.claimNext(workerName, limit)  — returns only missions whose
 *        dependencies are ALL in terminal-success ('completed'); claims
 *        each returned mission atomically (same conditional-UPDATE
 *        discipline as assign()).
 *   Do NOT invent the implementation to satisfy this test. Mark the
 *   mechanism INVENTION_REQUIRED (see ORCA-ARCHAEOLOGY-2026-09-23.md §2 #6).
 *
 * INVARIANT: a mission with an incomplete dependency is never dispatched.
 * Dependency satisfaction is evaluated atomically with the claim, cycles
 * are rejected at edge-insert time, and completing a dependency makes the
 * dependent claimable on the next poll.
 *
 * Run: node --test 03-dependency-incomplete-dependent-blocked.test.mjs
 * Expected today: the file SKIPS with the gap statement (no API to test).
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, uniqueType, makeRuntime,
  completedOk, getStatus, cleanupMissions, loadMissionRuntime,
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

function apiAvailable(rt) {
  return typeof rt.addDependency === 'function' && typeof rt.claimNext === 'function';
}

test('dependent mission is not claimable until its dependency completes', { skip: false }, async (t) => {
  const rt = await makeRuntime(pool, null);
  if (!apiAvailable(rt)) {
    t.skip(
      'DRAFT-UNGROUNDED: MissionRuntime has no addDependency/claimNext. ' +
      'Dependency-aware ready-set is INVENTION_REQUIRED (Orca has the edge ' +
      'table but no gating code; CRX has neither). See ORCA-ARCHAEOLOGY-2026-09-23.md §1.A4.'
    );
    return;
  }

  const typeA = uniqueType('dep_a');
  const typeB = uniqueType('dep_b');
  const a = await rt.create(typeA, { event_id: 'evt-a' }, { createdBy: 'test-03' });
  const b = await rt.create(typeB, { event_id: 'evt-b' }, { createdBy: 'test-03' });
  created.push(a, b);

  await rt.addDependency(b, a);

  // B's dependency is incomplete: claimNext must return A but never B.
  const first = await rt.claimNext('worker-1', 10);
  const ids = first.map((m) => m.mission_id);
  assert.ok(ids.includes(a), 'dependency A is claimable');
  assert.ok(!ids.includes(b), 'dependent B is NOT claimable while A is incomplete');

  // Complete A through the normal lifecycle; B becomes claimable.
  await rt.assign(a, 'worker-1');
  await rt.start(a, 'worker-1');
  assert.ok(completedOk(await rt.complete(a, { ok: true })));

  const second = await rt.claimNext('worker-1', 10);
  assert.ok(
    second.map((m) => m.mission_id).includes(b),
    'dependent B becomes claimable after A completes'
  );

  // A completed mission never reappears as claimable.
  const third = await rt.claimNext('worker-1', 10);
  assert.ok(!third.map((m) => m.mission_id).includes(a), 'completed A is never re-dispatched');
});

test('dependency cycles and self-edges are rejected at insert time', async (t) => {
  const rt = await makeRuntime(pool, null);
  if (!apiAvailable(rt)) {
    t.skip('DRAFT-UNGROUNDED: no addDependency API (see above).');
    return;
  }

  const x = await rt.create(uniqueType('dep_x'), {}, { createdBy: 'test-03' });
  const y = await rt.create(uniqueType('dep_y'), {}, { createdBy: 'test-03' });
  created.push(x, y);

  await assert.rejects(rt.addDependency(x, x), 'self-dependency must be rejected');

  await rt.addDependency(y, x); // y depends on x: fine
  await assert.rejects(
    rt.addDependency(x, y),
    'closing a cycle (x depends on y, y depends on x) must be rejected'
  );

  // Duplicate edge: idempotent, not an error, not a second row.
  await rt.addDependency(y, x);
});
