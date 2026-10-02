/**
 * 14 — reconciliation: truthful classification of orphaned executions.
 *
 * The mission question: when a worker disappears mid-run, what is the
 * mission's terminal truth? Two invariants:
 *   (1) "worker disappeared" is UNKNOWN_EXECUTION, never FAILED.
 *   (2) "timeout" is not proof the effect did not happen — the effect ledger
 *       (proven effect vs proven failure vs no evidence) decides whether the
 *       classifier may RETRY, must MARK_FAILED, must HEAL_COMPLETED, or must
 *       ESCALATE. ACK (the claim row) != EFFECT (the world change);
 *       RETRY != IDEMPOTENCY (re-running a proven effect is a double-execute).
 *
 * Part A (live): a startup scan over the live schema classifies three
 * missions — still-owned (SKIP), orphaned (UNKNOWN → requeue, NOT failed),
 * and completed-without-event (G-03: HEAL by publishing the missing event).
 *
 * Part B (mechanism): the proposal's ReconcileDecision classifier
 * (O-5/A7 vocabulary fold: RETRY / MARK_FAILED / HEAL_COMPLETED / SKIP /
 * ESCALATE) over {mission, lease, effect ledger} — the truth table for
 * UNKNOWN_EXECUTION vs FAILED.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  makePool, assertScratchDb, makeMissionRuntime, makeEventRuntime, uniqueType,
  getMission, cleanupMissions, dropEngineTables, cleanupEvents, expireLeaseNow,
} from './harness.mjs';

/** Startup-scan classifier, proposal shape: pure function of (mission, effects). */
function classifyReconcile(mission, effect) {
  const leaseValid = mission.lease_until && new Date(mission.lease_until) > new Date();
  const orphan = ['running', 'assigned'].includes(mission.status) && !leaseValid;
  if (mission.status === 'completed') {
    return { classification: 'COMPLETED_UNPUBLISHED', decision: 'HEAL_COMPLETED' };
  }
  if (!orphan) return { classification: 'IN_PROGRESS', decision: 'SKIP' };
  if (!effect) return { classification: 'UNKNOWN_EXECUTION', decision: 'RETRY' };
  if (effect.status === 'SUCCEEDED') return { classification: 'EFFECT_PROVEN', decision: 'HEAL_COMPLETED' };
  if (effect.status === 'FAILED') return { classification: 'FAILED', decision: 'MARK_FAILED' };
  // EXECUTING / AUTHORIZED: the effect began but has no outcome — retrying may
  // double-execute, failing is unproven. Fail closed: escalate.
  return { classification: 'UNKNOWN_EXECUTION', decision: 'ESCALATE' };
}

describe('14-reconciliation', () => {
  let pool, rt, ev;
  const created = [];
  const corr = `swarm02-reconcile-${Date.now().toString(36)}`;

  before(async () => {
    pool = makePool();
    await assertScratchDb(pool);
    ev = await makeEventRuntime(pool);
    rt = await makeMissionRuntime(pool, ev);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS swarm02_effects (
        effect_id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('AUTHORIZED','EXECUTING','SUCCEEDED','FAILED'))
      )`);
  });

  after(async () => {
    await cleanupMissions(pool, created);
    await cleanupEvents(pool, corr);
    await pool.query(`DROP TABLE IF EXISTS swarm02_effects`);
    await dropEngineTables(pool);
    await pool.end();
  });

  it('Part A: startup scan classifies owned / orphaned / unpublished', async () => {
    const t = uniqueType('recon');
    // m1: assigned, lease still valid → owned, SKIP.
    const m1 = await rt.create(t + '_1', { event_id: `evt-${t}-1`, correlation_id: corr });
    await rt.assign(m1, 'w1');
    // m2: running, lease expired → orphan, UNKNOWN_EXECUTION, requeue.
    const m2 = await rt.create(t + '_2', { event_id: `evt-${t}-2`, correlation_id: corr });
    await rt.assign(m2, 'w2'); await rt.start(m2);
    await expireLeaseNow(pool, m2);
    // m3: row completed but the MISSION_COMPLETED event was never journaled
    // (G-03: emit-after-update failed). Simulate with a direct row update.
    const m3 = await rt.create(t + '_3', { event_id: `evt-${t}-3`, correlation_id: corr });
    await rt.assign(m3, 'w3'); await rt.start(m3);
    await pool.query(
      `UPDATE ping_missions SET status = 'completed', completed_at = NOW() WHERE mission_id = $1`, [m3]);
    created.push(m1, m2, m3);

    const [r1, r2, r3] = await Promise.all([getMission(pool, m1), getMission(pool, m2), getMission(pool, m3)]);

    const c1 = classifyReconcile(r1, null);
    assert.deepEqual(c1, { classification: 'IN_PROGRESS', decision: 'SKIP' }, 'owned claim: skip');

    const c2 = classifyReconcile(r2, null);
    assert.deepEqual(c2, { classification: 'UNKNOWN_EXECUTION', decision: 'RETRY' },
      'orphaned claim with no effect evidence: UNKNOWN, not failed');

    // The retry action is the existing reaper: back to created, never failed.
    const reaped = await rt.reapExpiredLeases();
    assert.ok(reaped >= 1, 'orphan requeued');
    assert.equal((await getMission(pool, m2)).status, 'created', 'requeued to created');
    assert.equal((await getMission(pool, m2)).retries, 0, 'not counted as a retry');

    // m3: no MISSION_COMPLETED in the journal for this mission → heal.
    const journaled = await pool.query(
      `SELECT COUNT(*)::int c FROM ping_events
       WHERE event_type = 'MISSION_COMPLETED' AND payload->>'missionId' = $1`, [m3]);
    assert.equal(journaled.rows[0].c, 0, 'completion was never journaled (G-03)');
    const c3 = classifyReconcile(r3, null);
    assert.deepEqual(c3, { classification: 'COMPLETED_UNPUBLISHED', decision: 'HEAL_COMPLETED' });
    await ev.emit('MISSION_COMPLETED', 'reconciler', { missionId: m3, healed: true },
      { correlation_id: corr });
    const healed = await pool.query(
      `SELECT COUNT(*)::int c FROM ping_events
       WHERE event_type = 'MISSION_COMPLETED' AND payload->>'missionId' = $1`, [m3]);
    assert.equal(healed.rows[0].c, 1, 'missing completion event healed');
  });

  it('Part B: effect ledger decides RETRY vs MARK_FAILED vs ESCALATE (truth table)', async () => {
    const t = uniqueType('effect');
    const cases = [
      // [label, effectStatus|null, expectedClassification, expectedDecision]
      ['no evidence → unknown, safe to requeue', null, 'UNKNOWN_EXECUTION', 'RETRY'],
      ['effect proven → heal the row', 'SUCCEEDED', 'EFFECT_PROVEN', 'HEAL_COMPLETED'],
      ['effect proven failed → failed is truthful', 'FAILED', 'FAILED', 'MARK_FAILED'],
      ['effect in-flight → unknown, never double-execute', 'EXECUTING', 'UNKNOWN_EXECUTION', 'ESCALATE'],
    ];
    for (const [label, effectStatus, wantClass, wantDecision] of cases) {
      const m = await rt.create(`${t}_${wantDecision}`, { event_id: `evt-${t}-${wantDecision}` });
      created.push(m);
      await rt.assign(m, 'w'); await rt.start(m);
      await expireLeaseNow(pool, m);
      let effect = null;
      if (effectStatus) {
        const eid = `eff-${t}-${wantDecision}`;
        await pool.query(
          `INSERT INTO swarm02_effects (effect_id, mission_id, status) VALUES ($1, $2, $3)`,
          [eid, m, effectStatus]);
        effect = { status: effectStatus };
      }
      const mission = await getMission(pool, m);
      const got = classifyReconcile(mission, effect);
      assert.deepEqual(got, { classification: wantClass, decision: wantDecision }, label);

      // And the decision is acted on truthfully:
      if (wantDecision === 'MARK_FAILED') {
        await rt.fail(m, `effect ${effectStatus}: proven failure`);
        assert.equal((await getMission(pool, m)).status, 'failed', 'proven failure may be marked failed');
      } else if (wantDecision === 'RETRY') {
        await rt.reapExpiredLeases();
        assert.equal((await getMission(pool, m)).status, 'created', 'unknown execution requeued, not failed');
      } else if (wantDecision === 'HEAL_COMPLETED') {
        await rt.complete(m, { healed_from_effect: true });
        assert.equal((await getMission(pool, m)).status, 'completed', 'proven effect heals the row');
      } else {
        // ESCALATE: fail-closed — row untouched, no retry, no failure mark.
        assert.equal((await getMission(pool, m)).status, 'running', 'escalated: row untouched');
      }
    }
  });
});
