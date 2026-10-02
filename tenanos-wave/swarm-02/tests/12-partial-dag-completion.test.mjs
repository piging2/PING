/**
 * 12 — partial DAG completion (chain A→B→C, B fails exhaustively).
 *
 * The live "DAG" is the event chain: worker output events re-enter
 * EventToMissionBridge, which creates the next mission. There are no
 * dependency edges in the schema (G-04) — ordering is convention.
 *
 * Part A (live): B's exhaustive failure means C's triggering event is never
 * emitted, so C's mission is never created. Partial completion (A done,
 * B dead-lettered, C absent) is fully queryable.
 *
 * Part B (mechanism): the proposed `ping_mission_dependencies` representation
 * from P-20260923-006, executed against real PG — ready-set query, self-edge
 * rejection, cycle rejection.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, makeEventRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, cleanupEvents,
  MissionScheduler, WorkerRuntime, EventToMissionBridge, DeadLetterAuthority, stubWorker,
} from './harness.mjs';

describe('12-partial-dag-completion', () => {
  let pool, rt, ev, bridge, dlq, dlqRecords, fakeDlq;
  const created = [];
  const corr = `swarm02-dag-${Date.now().toString(36)}`;

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    ev = await makeEventRuntime(pool);
    rt = await makeMissionRuntime(pool, ev);
    bridge = new EventToMissionBridge({ eventRuntime: ev, missionRuntime: rt });
    bridge.start();
    dlq = new DeadLetterAuthority(pool);
    await dlq.initialize();
    // NOTE: the scheduler is wired to a FAKE dead-letter sink here. The real
    // DeadLetterAuthority.recordDeadLetter throws on live code (F-02:
    // CanonicalBytes.serialize rejects a raw Buffer inside the witness
    // envelope — see 09-timeout-before-effect), so the real sink is
    // documented there, not here. This file proves the scheduler ROUTES
    // exhaustion to the authority; the sink's own repair is P-20260923-092.
    dlqRecords = [];
    fakeDlq = { async recordDeadLetter(job, err) { dlqRecords.push({ job, err: err && err.message }); } };
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm02_dependencies (
        mission_id TEXT NOT NULL,
        depends_on TEXT NOT NULL,
        PRIMARY KEY (mission_id, depends_on),
        CHECK (mission_id <> depends_on)
      )`);
  });

  after(async () => {
    await cleanupMissions(pool, created);
    await cleanupEvents(pool, corr);
    await pool.query(`DELETE FROM repository_dead_letters WHERE payload->>'correlation_id' = $1`, [corr]);
    await pool.query(`DROP TABLE IF EXISTS swarm02_dependencies`);
    await dropEngineTables(pool);
    await pool.end();
  });

  it('Part A: B fails → C never created; partial state is queryable', async () => {
    const wr = new WorkerRuntime({});
    // A: succeeds and emits the event that triggers B. The scheduler
    // dispatches on the ORIGINAL business event type stored by the bridge
    // (payload.event_type), so the worker must register on
    // GITHUB_COMMIT_SYNCED — the event the bridge maps to DOCUMENT_IMPORT —
    // not on the mission_type.
    wr.register('observation', stubWorker('observation', async () => {
      await ev.emit('OBSERVATION_CREATED', 'test-worker',
        { note: 'a-done' }, { correlation_id: corr });
      return { status: 'ok' };
    }), { eventTypes: ['GITHUB_COMMIT_SYNCED'], maxConcurrent: 2 });
    // B: fails exhaustively on its first attempt (no output event ⇒ no C).
    wr.register('claim', stubWorker('claim', () => ({ status: 'failed', error: 'b exploded' })),
      { eventTypes: ['OBSERVATION_CREATED'], maxConcurrent: 2 });
    const s = new MissionScheduler({
      missionRuntime: rt, workerRuntime: wr, eventRuntime: ev,
      retryPolicy: { max_attempts: 1, backoff_delay_ms: 1 },
      deadLetterAuthority: fakeDlq, maxConcurrent: 5,
    });

    await ev.emit('GITHUB_COMMIT_SYNCED', 'test', { doc: 1 }, { correlation_id: corr });
    const mA = await pool.query(
      `SELECT mission_id FROM ping_missions WHERE mission_type='DOCUMENT_IMPORT'
       ORDER BY created_at DESC LIMIT 1`);
    assert.ok(mA.rows[0], 'bridge created the DOCUMENT_IMPORT mission');
    created.push(mA.rows[0].mission_id);

    await s._poll(); // dispatches A → emits OBSERVATION_CREATED → bridge creates B
    await s._poll(); // dispatches B → fails → DLQ (max_attempts=1)
    await s._poll(); // nothing left

    const missions = await pool.query(
      `SELECT mission_id, mission_type, status FROM ping_missions
       WHERE mission_id = ANY($1) OR payload->>'correlation_id' = $2`, [created, corr]);
    const byType = Object.fromEntries(missions.rows.map((m) => [m.mission_type, m]));
    for (const m of missions.rows) if (!created.includes(m.mission_id)) created.push(m.mission_id);

    assert.equal(byType.DOCUMENT_IMPORT.status, 'completed', 'A completed');
    assert.equal(byType.CLAIM_GENERATE.status, 'failed', 'B exhausted → failed');
    assert.ok(!byType.CLASSIFICATION_CREATE, 'C was never created (no triggering event)');

    const dlqRows = dlqRecords.filter((r) => r.job.correlation_id === corr);
    assert.equal(dlqRows.length, 1, 'B reached the dead-letter authority');
    assert.equal(dlqRows[0].job.job_type, 'CLAIM_GENERATE', 'dead-lettered job is B');

    const stats = await rt.getStats();
    assert.ok(stats.completed >= 1 && stats.failed >= 1, 'partial state visible in stats');
  });

  it('Part B: dependency-edge representation + ready-set (P-20260923-006 shape)', async () => {
    // Mission-level edges as data (proposal DDL mirrored in scratch).
    const t = uniqueType('depedge');
    const mA = await rt.create(t + '_A', { event_id: `evt-${t}-a` });
    const mB = await rt.create(t + '_B', { event_id: `evt-${t}-b` });
    created.push(mA, mB);
    await pool.query(`INSERT INTO swarm02_dependencies (mission_id, depends_on) VALUES ($1, $2)`, [mB, mA]);

    const readySet = async () => (await pool.query(`
      SELECT m.mission_id FROM ping_missions m
      WHERE m.status = 'created'
        AND NOT EXISTS (
          SELECT 1 FROM swarm02_dependencies d
          JOIN ping_missions dep ON dep.mission_id = d.depends_on
          WHERE d.mission_id = m.mission_id AND dep.status <> 'completed'
        )
        AND m.mission_id IN (SELECT mission_id FROM swarm02_dependencies)
    `)).rows.map((r) => r.mission_id);

    assert.deepEqual(await readySet(), [], 'B blocked while A is not completed');

    await rt.assign(mA, 'w'); await rt.start(mA); await rt.complete(mA, {});
    assert.deepEqual(await readySet(), [mB], 'B becomes ready when A completes');

    await assert.rejects(
      pool.query(`INSERT INTO swarm02_dependencies (mission_id, depends_on) VALUES ($1, $1)`, [mA]),
      'self-edge rejected by CHECK'
    );
    // Cycle A→B→A: second edge would close the loop — rejected by the
    // proposal's cycle guard (emulated here with a recursive CTE check).
    const closesCycle = async (from, to) => (await pool.query(`
      WITH RECURSIVE reach(n) AS (
        SELECT depends_on FROM swarm02_dependencies WHERE mission_id = $1
        UNION SELECT d.depends_on FROM swarm02_dependencies d JOIN reach r ON d.mission_id = r.n
      ) SELECT EXISTS(SELECT 1 FROM reach WHERE n = $2) AS cycle
    `, [to, from])).rows[0].cycle;
    assert.equal(await closesCycle(mA, mB), true, 'A→B→A detected as a cycle before insert');
  });
});
