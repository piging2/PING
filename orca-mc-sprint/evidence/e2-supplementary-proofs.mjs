#!/usr/bin/env node
/**
 * E2 supplementary proofs (not part of Falsifier-E): STARTED_AT wart repair,
 * liveness sweep (reconcileHeldMissions), and _reconcileUnknown fail-closed
 * paths. Uses staged live bytes. Exit 0 = all pass.
 */
import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = '/home/hatch/workspace/orca-mc-sprint/evidence/holdproof-stage';
const ORCH = path.join(STAGE, 'ping-runtime', 'orchestration');
const requireCjs = createRequire(import.meta.url);
const { MissionRuntime } = requireCjs(path.join(ORCH, 'mission_runtime.patched.cjs'));
const { MissionScheduler } = requireCjs(path.join(ORCH, 'mission_scheduler.js'));

const TENANT = 'test-tenant';
let pass = 0, fail = 0;
function check(id, ok, detail) {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
}
async function freshPool() {
  const db = new PGlite();
  const pool = {
    async query(sql, params = []) {
      const stmts = String(sql).split(';').map(s => s.trim()).filter(Boolean);
      let last = null;
      for (const s of stmts) { last = await db.query(s, params); params = []; }
      return last;
    },
  };
  return { db, pool };
}
function mkScheduler(R, captured) {
  return new MissionScheduler({
    missionRuntime: R,
    workerRuntime: { getStats: () => ({ workers: {} }), dispatch: async () => { throw new Error('not used'); } },
    eventRuntime: { emit: async (t, s, d) => { captured.push({ t, s, d }); } },
  });
}

// ---- S1: STARTED_AT wart — resolved-then-reclaimed mission is NOT re-flagged stuck
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool });
  await R.initialize();
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S1' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation');
  await R.start(mid);
  await R.markHold(mid, 's1: unknown outcome');
  const rs = await R.resolveHold(mid, 'PROVEN_NOT_OCCURRED');
  const rowAfter = (await pool.query(`SELECT status, hold_at, started_at, claimed_at FROM ping_missions WHERE mission_id=$1`, [mid])).rows[0];
  await R.assign(mid, 'w-new'); // fresh claim: claimed_at=NOW(), started_at should be NULL
  // cutoff 1h in the past: pre-fix, stale started_at (from the stuck attempt) would flag this
  const stuck = await R.findStuckRunning(new Date(Date.now() - 3600000).toISOString());
  const flagged = stuck.some(r => r.mission_id === mid);
  check('S1-started_at-reset-no-spurious-restuck',
    rs === 1 && rowAfter.started_at === null && rowAfter.status === 'created' && !flagged,
    `resolve=${rs} started_at=${rowAfter.started_at} post_assign_stuck_flag=${flagged}`);

  // S1b: prove the mechanism — a stale started_at DOES outrank fresh claimed_at (the wart, reconstructed)
  const midB = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S1b' }, { tenant_id: TENANT });
  await R.assign(midB, 'w-new');
  await pool.query(`UPDATE ping_missions SET started_at = NOW() - INTERVAL '2 hours' WHERE mission_id=$1`, [midB]);
  const stuckB = await R.findStuckRunning(new Date(Date.now() - 3600000).toISOString());
  check('S1b-wart-mechanism-confirmed',
    stuckB.some(r => r.mission_id === midB),
    `stale started_at + fresh claimed_at => flagged stuck (this is what the reset prevents)`);
}

// ---- S2: liveness sweep — late completion ack while held resolves PROVEN_OCCURRED
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool });
  await R.initialize();
  const captured = [];
  const S = mkScheduler(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S2' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation');
  await R.start(mid);
  await R.markHold(mid, 's2: unknown outcome');           // worker crossed boundary, killed before ack
  await R.complete(mid, { ok: true, charge_id: 'ch_1' }); // late ack lands (complete has no hold guard)
  const heldBefore = await R.findHeld(10);
  const resolved = await S.reconcileHeldMissions();
  const row = (await pool.query(`SELECT status, hold_at, result FROM ping_missions WHERE mission_id=$1`, [mid])).rows[0];
  const res = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
  const heldAfter = await R.findHeld(10);
  const holdEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length;
  check('S2-liveness-sweep-proven-occurred',
    heldBefore.length === 1 && resolved === 1 && row.status === 'completed' && row.hold_at === null &&
    res.charge_id === 'ch_1' && res.hold_resolution === 'PROVEN_OCCURRED' && heldAfter.length === 0 &&
    holdEvents === 0,
    `held_before=${heldBefore.length} resolved=${resolved} status=${row.status} result_adopted=${res.charge_id === 'ch_1'} held_after=${heldAfter.length} new_events=${holdEvents}`);

  // S2b: held mission with NO proof stays held (fail closed)
  const mid2 = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S2b' }, { tenant_id: TENANT });
  await R.assign(mid2, 'observation');
  await R.start(mid2);
  await R.markHold(mid2, 's2b: still unknown');
  const resolved2 = await S.reconcileHeldMissions();
  const row2 = (await pool.query(`SELECT status, hold_at FROM ping_missions WHERE mission_id=$1`, [mid2])).rows[0];
  check('S2b-no-proof-hold-stands',
    resolved2 === 0 && row2.hold_at !== null && row2.status === 'running',
    `resolved=${resolved2} hold_at=${row2.hold_at !== null ? 'SET' : 'NULL'} status=${row2.status}`);

  // S2c: end-to-end via scheduler: _reconcileUnknown holds, late ack, sweep resolves
  const mid3 = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S2c' }, { tenant_id: TENANT });
  await R.assign(mid3, 'observation');
  await R.start(mid3);
  const snap = (await R.findStuckRunning(new Date(Date.now() + 60000).toISOString())).find(r => r.mission_id === mid3);
  const rec = await S._reconcileUnknown(snap, 'observation', 's2c: watchdog');
  await R.complete(mid3, { ok: true });
  const resolved3 = await S.reconcileHeldMissions();
  const row3 = (await pool.query(`SELECT status, hold_at FROM ping_missions WHERE mission_id=$1`, [mid3])).rows[0];
  check('S2c-scheduler-end-to-end',
    !!rec && resolved3 === 1 && row3.status === 'completed' && row3.hold_at === null,
    `hold_record=${!!rec} sweep_resolved=${resolved3} status=${row3.status}`);
}

// ---- S3: _reconcileUnknown fail-closed — terminal row, markHold→0, NO emit
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool });
  await R.initialize();
  const captured = [];
  const S = mkScheduler(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S3' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation');
  await R.start(mid);
  await R.complete(mid, { ok: true }); // outcome already recorded; stale snapshot says running
  const staleSnap = { ...(await R.getMission(mid)), status: 'running' };
  const rec = await S._reconcileUnknown(staleSnap, 'observation', 's3: stale snapshot');
  const holdEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length;
  check('S3-fail-closed-terminal-row',
    rec === null && holdEvents === 0 && !S._reconciled.has(mid),
    `returned=${rec} HOLD_events=${holdEvents} dedup_cleared=${!S._reconciled.has(mid)}`);

  // S3b: already-held row (parallel reconciler) — hold stands, emit truthful
  const mid4 = await R.create('OBSERVATION_CREATE', { event_id: 'evt-S3b' }, { tenant_id: TENANT });
  await R.assign(mid4, 'observation');
  await R.start(mid4);
  await R.markHold(mid4, 's3b: first reconciler');
  const snap4 = await R.getMission(mid4);
  const rec4 = await S._reconcileUnknown(snap4, 'observation', 's3b: second reconciler');
  const holdEvents4 = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD' && e.d.missionId === mid4).length;
  const row4 = await R.getMission(mid4);
  check('S3b-already-held-honored',
    !!rec4 && holdEvents4 === 1 && row4.hold_at !== null,
    `record=${!!rec4} HOLD_events=${holdEvents4} hold_at=SET`);
}

console.log(`\n${pass}/${pass + fail} supplementary checks passed.`);
process.exit(fail === 0 ? 0 : 1);
