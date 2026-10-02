/**
 * 13 — restart: the coordinator (scheduler) dies mid-run.
 *
 * Live behavior under test: a crashed scheduler leaves a claimed/running
 * mission whose lease no one renews (Arrow 0 runs on the scheduler's
 * _processing set — dead scheduler, no renewal). The reaper (Arrow 1) must
 * reclaim it to 'created' WITHOUT ever marking it failed: a disappeared
 * worker is not a failed worker (ACK!=EFFECT: the claim row is an ACK of
 * ownership, not proof of execution).
 *
 * Part A (live): kill-coordinator simulation → lease expires → replacement
 * coordinator reaps → re-claims → completes. `retries` stays 0 throughout;
 * the mission row never enters 'failed'.
 *
 * Part B (mechanism): the attempt-fencing shape from proposal P-20260923-090 —
 * two physical executions of one mission must be distinguishable, and a
 * zombie attempt's writes must fail closed (STALE_ATTEMPT) once its fencing
 * token is rotated.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, makeEventRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, cleanupEvents, expireLeaseNow,
} from './harness.mjs';

describe('13-restart-coordinator', () => {
  let pool, rt, ev;
  const created = [];
  const corr = `swarm02-restart-${Date.now().toString(36)}`;

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    ev = await makeEventRuntime(pool);
    rt = await makeMissionRuntime(pool, ev);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm02_attempts (
        attempt_id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        fencing_token TEXT NOT NULL,
        status TEXT NOT NULL,
        heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
  });

  after(async () => {
    await cleanupMissions(pool, created);
    await cleanupEvents(pool, corr);
    await pool.query(`DROP TABLE IF EXISTS swarm02_attempts`);
    await dropEngineTables(pool);
    await pool.end();
  });

  it('Part A: dead scheduler → lease expires → reaped to created, never failed', async () => {
    const t = uniqueType('crash');
    const m = await rt.create(t, { event_id: `evt-${t}`, correlation_id: corr });
    created.push(m);

    // Scheduler claims and starts the mission, then dies mid-dispatch
    // (no Arrow-0 lease renewal — the process is gone).
    assert.equal(await rt.assign(m, 'scheduler-1'), 1, 'claimed by scheduler-1');
    await rt.start(m);
    let row = await getMission(pool, m);
    assert.equal(row.status, 'running', 'mission is running under the dead scheduler');

    // The replacement coordinator boots and runs the reaper.
    await expireLeaseNow(pool, m);
    const rt2 = await makeMissionRuntime(pool, ev); // second MissionRuntime instance
    const reaped = await rt2.reapExpiredLeases();
    assert.equal(reaped, 1, 'orphaned claim reclaimed');

    row = await getMission(pool, m);
    assert.equal(row.status, 'created', 'reclaimed to created');
    assert.equal(row.retries, 0, 'a disappeared worker is not a retry');
    assert.equal(row.assigned_to, null, 'claim state cleared');

    const leaseEvents = await pool.query(
      `SELECT COUNT(*)::int c FROM ping_events
       WHERE event_type = 'MISSION_LEASE_EXPIRED' AND payload->>'missionId' = $1`, [m]);
    assert.equal(leaseEvents.rows[0].c, 1, 'MISSION_LEASE_EXPIRED journaled');

    // The replacement coordinator re-claims and the mission completes exactly once.
    assert.equal(await rt2.assign(m, 'scheduler-2'), 1, 're-claimed by scheduler-2');
    await rt2.start(m);
    await rt2.complete(m, { recovered: true });
    row = await getMission(pool, m);
    assert.equal(row.status, 'completed', 'completed once');
    assert.equal(row.retries, 0, 'still no retry counted');
  });

  it('Part B: attempt fencing — zombie writes fail closed (proposal shape)', async () => {
    const t = uniqueType('fence');
    const m = await rt.create(t, { event_id: `evt-${t}` });
    created.push(m);

    // Attempt 1 claimed with fencing token A; worker dies mid-run.
    const a1 = `att-${t}-1`;
    await pool.query(
      `INSERT INTO swarm02_attempts (attempt_id, mission_id, fencing_token, status)
       VALUES ($1, $2, 'fence-A', 'running')`, [a1, m]);

    // Replacement attempt 2 rotates the fencing token (what reaping must do).
    const a2 = `att-${t}-2`;
    await pool.query(
      `UPDATE swarm02_attempts SET status = 'stale' WHERE attempt_id = $1 AND fencing_token = 'fence-A'`,
      [a1]);
    await pool.query(
      `INSERT INTO swarm02_attempts (attempt_id, mission_id, fencing_token, status)
       VALUES ($1, $2, 'fence-B', 'running')`, [a2, m]);

    // The zombie attempt 1 wakes up and tries to heartbeat with its stale
    // token: the write must match zero rows — STALE_ATTEMPT, fail closed.
    const zombieWrite = await pool.query(
      `UPDATE swarm02_attempts SET heartbeat_at = NOW(), status = 'completed'
       WHERE attempt_id = $1 AND fencing_token = 'fence-A' AND status = 'running'`,
      [a1]);
    assert.equal(zombieWrite.rowCount, 0, 'zombie heartbeat with stale token writes nothing');

    const rows = await pool.query(
      `SELECT attempt_id, fencing_token, status FROM swarm02_attempts WHERE mission_id = $1 ORDER BY attempt_id`,
      [m]);
    assert.deepEqual(
      rows.rows.map((r) => r.status),
      ['stale', 'running'],
      'two physical executions are distinguishable; exactly one is live'
    );

    // Attempt 2 completes legitimately.
    const legit = await pool.query(
      `UPDATE swarm02_attempts SET status = 'completed'
       WHERE attempt_id = $1 AND fencing_token = 'fence-B' AND status = 'running'`,
      [a2]);
    assert.equal(legit.rowCount, 1, 'live attempt completes');
  });
});
