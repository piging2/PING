/**
 * 08 — duplicate dispatch.
 *
 * Invariants (live MissionRuntime):
 *  (a) create() is idempotent: same (missionType, event_id) → same mission_id,
 *      second call is a no-op (ON CONFLICT DO NOTHING).
 *  (b) Two concurrent claims: exactly one assign() returns rowCount 1.
 *  (c) complete() is idempotent: second call is a no-op, result not overwritten.
 *  (d) No resurrection: assign()/start()/complete() on a terminal mission
 *      match zero rows.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables,
} from './harness.mjs';

describe('08-duplicate-dispatch', () => {
  let pool, rt;
  const created = [];

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    rt = await makeMissionRuntime(pool, null);
  });

  after(async () => {
    await dropEngineTables(pool);
    await pool.end();
  });

  it('create() is idempotent on (missionType, event_id)', async () => {
    const t = uniqueType('dup_create');
    const eventId = `evt-${t}`;
    const m1 = await rt.create(t, { event_id: eventId });
    const m2 = await rt.create(t, { event_id: eventId });
    created.push(m1);
    assert.equal(m1, m2, 'same event must map to the same mission_id');
    const row = await getMission(pool, m1);
    assert.equal(row.status, 'created');
    const count = await pool.query(
      `SELECT COUNT(*)::int AS c FROM ping_missions WHERE mission_id = $1`, [m1]);
    assert.equal(count.rows[0].c, 1, 'exactly one row despite two creates');
  });

  it('concurrent claims: exactly one winner', async () => {
    const t = uniqueType('dup_claim');
    const mid = await rt.create(t, { event_id: `evt-${t}` });
    created.push(mid);
    const [r1, r2] = await Promise.all([
      rt.assign(mid, 'worker-a'),
      rt.assign(mid, 'worker-b'),
    ]);
    assert.equal(r1 + r2, 1, 'exactly one claim may succeed');
    const row = await getMission(pool, mid);
    assert.match(row.assigned_to, /^worker-[ab]$/);
    assert.equal(row.status, 'assigned');
  });

  it('complete() twice: second is a no-op, result preserved', async () => {
    const t = uniqueType('dup_complete');
    const mid = await rt.create(t, { event_id: `evt-${t}` });
    created.push(mid);
    await rt.assign(mid, 'w');
    await rt.start(mid);
    await rt.complete(mid, { answer: 42 });
    const before = await getMission(pool, mid);
    await rt.complete(mid, { answer: 999 });
    const afterRow = await getMission(pool, mid);
    assert.equal(afterRow.status, 'completed');
    assert.deepEqual(afterRow.result, before.result, 'result must not be overwritten');
    assert.equal(afterRow.result.answer, 42);
  });

  it('terminal missions cannot be resurrected', async () => {
    const t = uniqueType('no_resurrect');
    const mid = await rt.create(t, { event_id: `evt-${t}` });
    created.push(mid);
    await rt.assign(mid, 'w');
    await rt.start(mid);
    await rt.complete(mid, {});
    assert.equal(await rt.assign(mid, 'w2'), 0, 'assign on completed = 0 rows');
    const row = await getMission(pool, mid);
    assert.equal(row.status, 'completed');
    assert.equal(row.assigned_to, 'w', 'assigned_to unchanged');
  });

  it('failed missions cannot be restarted via start()', async () => {
    const t = uniqueType('no_restart');
    const mid = await rt.create(t, { event_id: `evt-${t}` });
    created.push(mid);
    await rt.assign(mid, 'w');
    await rt.start(mid);
    await rt.fail(mid, 'boom');
    await rt.start(mid); // no-op: not in 'assigned'
    const row = await getMission(pool, mid);
    assert.equal(row.status, 'failed');
  });
});
