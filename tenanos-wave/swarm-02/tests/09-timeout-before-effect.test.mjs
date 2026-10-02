/**
 * 09 — timeout before effect (worker dies before any side effect).
 *
 * Intended invariant: a worker that fails BEFORE performing its external
 * effect is retried safely — failWithRetry → retry_pending → due → re-dispatch
 * → success — and the effect happens exactly once.
 *
 * LIVE-CODE DEFECT F-01 (proven 2026-09-23 by running this file against
 * /home/nolan/ping): the retry_pending state is not a real retry state.
 * getPending() returns due retry_pending missions, but _dispatch()'s claim
 * path can never transition them (assign() requires status='created';
 * start() requires 'assigned'; failWithRetry's retry branch requires
 * IN ('running','assigned')). Consequences: (a) retried missions are stuck
 * in retry_pending forever — retries never increment, they never complete;
 * (b) _dispatch() does not gate on claim success, so the worker RE-EXECUTES
 * on every poll with no state progress. The `reclaimRetryPending()` the
 * failWithRetry docstring promises does not exist (doc drift, already
 * flagged in ENGINE-INVENTORY.md). This file is the acceptance battery for
 * proposal P-20260923-091 (retry-path repair); it FAILS on live code until
 * that proposal is applied.
 *
 * NOTE (honest boundary): a worker that HANGS (never settles) cannot be
 * exercised here: live _dispatch() awaits WorkerRuntime.dispatch() with no
 * timeout (G-02, proven by inspection of mission_scheduler.js:231). The hang
 * case is closed by the dispatch-watchdog proposal, not by this test.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, retryDueNow,
  MissionScheduler, WorkerRuntime, stubWorker, DeadLetterAuthority,
} from './harness.mjs';

describe('09-timeout-before-effect', () => {
  let pool, rt, wr, scheduler;
  const created = [];

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    rt = await makeMissionRuntime(pool, null);
    wr = new WorkerRuntime({});
    // Fails twice (before touching the effect), succeeds on the third call.
    const flaky = stubWorker('observation', (self) => {
      if (self.calls <= 2) throw new Error(`simulated death before effect (call ${self.calls})`);
      self.effects += 1; // the external effect happens only on success
      return { status: 'ok', effects: self.effects };
    });
    wr.register('observation', flaky, { eventTypes: ['DOCUMENT_IMPORT'], maxConcurrent: 1 });
    wr._flaky = flaky;
    scheduler = new MissionScheduler({
      missionRuntime: rt,
      workerRuntime: wr,
      eventRuntime: null,
      retryPolicy: { max_attempts: 5, backoff_delay_ms: 60_000 },
    });
  });

  after(async () => {
    await dropEngineTables(pool);
    await pool.end();
  });

  it('fail-before-effect retries safely; effect occurs exactly once', async () => {
    const t = uniqueType('pre_effect');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);

    await scheduler._poll(); // call 1 → throw → retry_pending(1)
    let row = await getMission(pool, mid);
    assert.equal(row.status, 'retry_pending');
    assert.equal(row.retries, 1);
    assert.equal(wr._flaky.effects, 0, 'no effect may happen on failed attempts');

    await retryDueNow(pool, mid);
    await scheduler._poll(); // call 2 → throw → retry_pending(2)
    row = await getMission(pool, mid);
    assert.equal(row.status, 'retry_pending');
    assert.equal(row.retries, 2);
    assert.equal(wr._flaky.effects, 0);

    await retryDueNow(pool, mid);
    await scheduler._poll(); // call 3 → success → completed
    row = await getMission(pool, mid);
    assert.equal(row.status, 'completed');
    assert.equal(wr._flaky.effects, 1, 'effect performed exactly once');
    assert.equal(wr._flaky.calls, 3);
  });

  it('exhaustion routes to failed (and DLQ when wired)', async () => {
    const t = uniqueType('pre_effect_dlq');
    const mid = await rt.create('DOCUMENT_IMPORT', { event_id: `evt-${t}`, event_type: 'DOCUMENT_IMPORT' });
    created.push(mid);
    // Register an always-failing worker under a fresh mission type path:
    // reuse 'observation' slot is taken; use a dedicated scheduler with max_attempts=1.
    const wr2 = new WorkerRuntime({});
    const doomed = stubWorker('observation', () => { throw new Error('always dies'); });
    wr2.register('observation', doomed, { eventTypes: ['DOCUMENT_IMPORT'], maxConcurrent: 1 });
    const dlqRecords = [];
    const fakeDlq = { async recordDeadLetter(job, err) { dlqRecords.push({ job, err: err.message }); } };
    const s2 = new MissionScheduler({
      missionRuntime: rt,
      workerRuntime: wr2,
      retryPolicy: { max_attempts: 1, backoff_delay_ms: 1 },
      deadLetterAuthority: fakeDlq,
    });
    await s2._poll();
    const row = await getMission(pool, mid);
    assert.equal(row.status, 'failed', 'exhausted → failed');
    assert.equal(dlqRecords.length, 1, 'exhaustion routes to the dead-letter authority');
    assert.equal(dlqRecords[0].job.mission_id, mid);
  });

  it('F-02 DOCUMENTED: the real dead-letter sink throws (exhaustion silently unsunk)', async () => {
    // DeadLetterAuthority.recordDeadLetter throws on live code:
    // witnessAuthority.createWitness → CanonicalAuthority.hash →
    // CanonicalBytes.serialize rejects a raw Buffer inside the witness
    // envelope ("does not accept raw Buffer. Use fromBuffer() instead").
    // MissionScheduler._failMission catches and only console.errors, so an
    // exhausted mission is marked failed but NEVER reaches
    // repository_dead_letters. The scheduler's routing is proven (fake DLQ
    // above); the sink itself is repaired by P-20260923-092.
    const realDlq = new DeadLetterAuthority(pool);
    await realDlq.initialize();
    const err = await realDlq.recordDeadLetter(
      {
        job_id: 'swarm02-f02', job_type: 'CLAIM_GENERATE', mission_id: 'swarm02-f02',
        correlation_id: 'swarm02-f02', causation_id: 'swarm02-f02',
        authority: 'MissionScheduler', authority_version: '1.0.0',
        created_at: Date.now(), retry_count: 1, payload: {},
      },
      new Error('b exploded')
    ).then(() => null, (e) => e);
    assert.ok(err, 'recordDeadLetter throws on live code');
    assert.match(err.message, /raw Buffer/, 'the witness envelope carries a raw Buffer');
  });
});
