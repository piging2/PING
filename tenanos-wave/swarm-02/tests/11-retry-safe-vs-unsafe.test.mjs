/**
 * 11 — retry-safe vs retry-unsafe operations.
 *
 * Retry-SAFE: the operation is idempotent by construction (deterministic
 * mission identity + pure worker). N failures followed by success leave
 * exactly one mission row, retries=N, and one correct result.
 *
 * Retry-UNSAFE: the operation has a non-idempotent external effect and no
 * ledger gate. Documents that the live retry path is only safe for
 * idempotent work — the unsafe class REQUIRES the P-20260923-005 ledger.
 *
 * LIVE-CODE DEFECT F-01 (proven 2026-09-23, see 09-timeout-before-effect):
 * the retry_pending state is not a real retry state — retried missions
 * strand in retry_pending and the worker re-executes on every poll with no
 * state progress. Both tests below FAIL on live code until proposal
 * P-20260923-091 (retry-path repair) is applied; they are its acceptance
 * battery. (The UNSAFE case is worse live than documented: the customer is
 * re-emailed on EVERY poll, forever, with the row never advancing.)
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, retryDueNow,
  MissionScheduler, WorkerRuntime, stubWorker,
} from './harness.mjs';

describe('11-retry-safe-vs-unsafe', () => {
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

  function makeSchedulerWith(worker, retryPolicy) {
    const wr = new WorkerRuntime({});
    wr.register('observation', worker, { eventTypes: ['DOCUMENT_IMPORT'], maxConcurrent: 1 });
    return new MissionScheduler({ missionRuntime: rt, workerRuntime: wr, retryPolicy });
  }

  it('retry-SAFE: idempotent worker converges to one correct result', async () => {
    const t = uniqueType('retry_safe');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);
    let computations = 0;
    // Pure/idempotent: recomputing is harmless; same input → same output.
    const pure = stubWorker('observation', (self) => {
      computations += 1;
      if (self.calls < 3) throw new Error(`transient ${self.calls}`);
      return { status: 'ok', value: 40 + 2 }; // deterministic
    });
    const s = makeSchedulerWith(pure, { max_attempts: 5, backoff_delay_ms: 60_000 });

    for (let i = 0; i < 3; i++) { await s._poll(); await retryDueNow(pool, mid); }

    const row = await getMission(pool, mid);
    assert.equal(row.status, 'completed');
    assert.equal(row.retries, 2, 'two failures counted');
    assert.equal(row.result.value, 42, 'one correct result');
    assert.equal(computations, 3, 'recomputation is safe because the op is pure');
    const n = await pool.query(`SELECT COUNT(*)::int c FROM ping_missions WHERE mission_id=$1`, [mid]);
    assert.equal(n.rows[0].c, 1, 'still exactly one mission row');
  });

  it('retry-UNSAFE: non-idempotent effect without a ledger duplicates', async () => {
    const t = uniqueType('retry_unsafe');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);
    const sentEmails = [];
    // Non-idempotent: each execution sends a real email. No ledger gate.
    const sender = stubWorker('observation', (self) => {
      sentEmails.push(`email-${self.calls}-to-customer`);
      if (self.calls < 2) throw new Error('smtp timeout after send');
      return { status: 'ok' };
    });
    const s = makeSchedulerWith(sender, { max_attempts: 5, backoff_delay_ms: 60_000 });

    await s._poll(); await retryDueNow(pool, mid);
    await s._poll();

    const row = await getMission(pool, mid);
    assert.equal(row.status, 'completed');
    assert.equal(sentEmails.length, 2,
      'UNSAFE DOCUMENTED: the customer got 2 emails; live retry has no effect gate. ' +
      'This class requires the P-20260923-005 effect ledger.');
  });
});
