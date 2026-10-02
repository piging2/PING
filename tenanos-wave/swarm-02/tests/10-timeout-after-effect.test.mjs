/**
 * 10 — timeout AFTER effect (UNKNOWN_EXECUTION).
 *
 * The hard case: the worker performs its external effect, THEN dies before
 * reporting (throw after the side effect, crash between effect and complete()).
 * The mission row says `running`; the outside world says "done". A blind retry
 * duplicates the effect.
 *
 * Part A (live code): proves the gap — retry duplicates the effect because no
 * execution path consults an effect ledger (EffectAuthority is unwired and
 * in-memory; approval_restart_durability.test.js documents the defect).
 *
 * Part B (mechanism): proves the fix shape from proposal P-20260923-005 — a
 * durable effect ledger keyed by deterministic effect id, consulted before
 * re-execution (reconcile-vs-retry). Duplicate suppressed; cached result reused.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  makePool, assertScratchDb, makeMissionRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, retryDueNow,
  MissionScheduler, WorkerRuntime, stubWorker,
} from './harness.mjs';

const effectIdFor = (capability, target) =>
  'effect_' + createHash('sha256').update(JSON.stringify({ capability, target })).digest('hex').slice(0, 16);

describe('10-timeout-after-effect', () => {
  let pool, rt;
  const created = [];

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    rt = await makeMissionRuntime(pool, null);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm02_effect_ledger (
        effect_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,          -- AUTHORIZED | EXECUTING | SUCCEEDED | FAILED
        result JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
  });

  after(async () => {
    await cleanupMissions(pool, created);
    await pool.query(`DROP TABLE IF EXISTS swarm02_effect_ledger`);
    await dropEngineTables(pool);
    await pool.end();
  });

  it('Part A (gap): blind retry after effect duplicates the side effect', async () => {
    const t = uniqueType('post_effect');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);
    let sideEffects = 0;
    const wr = new WorkerRuntime({});
    // Performs the effect, THEN dies before returning — the UNKNOWN case.
    const killer = stubWorker('observation', (self) => {
      sideEffects += 1;                       // external effect performed…
      throw new Error('died after effect, before report');  // …then death
    });
    wr.register('observation', killer, { eventTypes: ['DOCUMENT_IMPORT'], maxConcurrent: 1 });
    const s = new MissionScheduler({
      missionRuntime: rt, workerRuntime: wr,
      retryPolicy: { max_attempts: 5, backoff_delay_ms: 60_000 },
    });

    await s._poll(); // attempt 1: effect + death → retry_pending
    await retryDueNow(pool, mid);
    await s._poll(); // attempt 2: effect + death → retry_pending (duplicate!)

    const row = await getMission(pool, mid);
    assert.equal(row.status, 'retry_pending');
    assert.equal(sideEffects, 2, 'GAP PROVEN: the external effect ran twice with no ledger to stop it');
  });

  it('Part B (mechanism): ledger-gated re-execution reconciles instead of duplicating', async () => {
    const t = uniqueType('post_effect_fix');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);
    const eid = effectIdFor('email.send', `target-${t}`);
    let sideEffects = 0;

    // reconcile-vs-retry gate, mirroring proposal P-20260923-005:
    // deterministic effect id → if SUCCEEDED, reuse cached result (RECONCILE);
    // only EXECUTE when no terminal record exists (RETRY).
    async function gatedExecute() {
      const existing = await pool.query(
        `SELECT status, result FROM swarm02_effect_ledger WHERE effect_id = $1`, [eid]);
      if (existing.rows[0]?.status === 'SUCCEEDED') {
        return { status: 'ok', reconciled: true, result: existing.rows[0].result };
      }
      await pool.query(
        `INSERT INTO swarm02_effect_ledger (effect_id, status) VALUES ($1, 'EXECUTING')
         ON CONFLICT (effect_id) DO UPDATE SET status = 'EXECUTING'`, [eid]);
      sideEffects += 1; // the real external effect, performed once
      const result = { sent: true, target: `target-${t}` };
      await pool.query(
        `UPDATE swarm02_effect_ledger SET status = 'SUCCEEDED', result = $2 WHERE effect_id = $1`,
        [eid, JSON.stringify(result)]);
      throw new Error('died after effect, before report'); // death still happens…
    }

    const wr = new WorkerRuntime({});
    wr.register('observation', stubWorker('observation', () => gatedExecute()),
      { eventTypes: ['DOCUMENT_IMPORT'], maxConcurrent: 1 });
    const s = new MissionScheduler({
      missionRuntime: rt, workerRuntime: wr,
      retryPolicy: { max_attempts: 5, backoff_delay_ms: 60_000 },
    });

    await s._poll(); // attempt 1: effect once, ledger SUCCEEDED, then death → retry_pending
    assert.equal(sideEffects, 1);
    await retryDueNow(pool, mid);
    await s._poll(); // attempt 2: ledger hit → RECONCILE, no second effect → completed

    const row = await getMission(pool, mid);
    assert.equal(row.status, 'completed', 'reconciled attempt completes without re-executing');
    assert.equal(sideEffects, 1, 'MECHANISM PROVEN: effect performed exactly once across death + retry');
    await pool.query(`DELETE FROM swarm02_effect_ledger WHERE effect_id = $1`, [eid]);
  });
});
