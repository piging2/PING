#!/usr/bin/env node
// E3 hostile rerun: H3 corrected assertions + H5c (cut off earlier by OOM)
import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import path from 'node:path';

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
  const pool = { async query(sql, params = []) {
    const stmts = String(sql).split(';').map(s => s.trim()).filter(Boolean);
    let last = null;
    for (const s of stmts) { last = await db.query(s, params); params = []; }
    return last;
  } };
  return { pool };
}
async function rowOf(pool, id) {
  return (await pool.query(
    `SELECT mission_id, status, hold_at, retry_at, result FROM ping_missions WHERE mission_id=$1`, [id])).rows[0];
}
async function expireLease(pool, id) {
  await pool.query(`UPDATE ping_missions SET lease_until = NOW() - INTERVAL '1 second' WHERE mission_id=$1`, [id]);
}
function mkSched(R, captured, opts = {}) {
  return new MissionScheduler({
    missionRuntime: R,
    workerRuntime: { getStats: () => ({ workers: {} }), dispatch: async () => { throw new Error('x'); } },
    eventRuntime: { emit: async (t, s, d) => { captured.push({ t, s, d }); } },
    ...opts,
  });
}

// H3a corrected: re-held as created via the REAL recovery path, REAL complete() lands, sweep resolves
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'h3a2' }, { tenant_id: TENANT });
  await R.assign(mid, 'w'); await R.start(mid);
  const snap = await R.getMission(mid); // reconciler snapshot: running, unheld
  await expireLease(pool, mid);
  await R.reapExpiredLeases(); // reaper wins the race -> created, retry_at=NOW()
  const rec = await S._reconcileUnknown(snap, 'w', 'C1 race: markHold->0, recovery re-holds');
  const ret = await R.complete(mid, { ok: true, late: 'attempt-1-ack' }); // REAL complete()
  const midRow = await rowOf(pool, mid);
  const midRes = typeof midRow.result === 'string' ? JSON.parse(midRow.result) : midRow.result;
  const resolved = await S.reconcileHeldMissions();
  const after = await rowOf(pool, mid);
  const resAfter = typeof after.result === 'string' ? JSON.parse(after.result) : after.result;
  const pending = await R.getPending(10);
  check('H3a-corrected',
    rec !== null && ret === undefined && midRow.status === 'completed' && midRow.hold_at !== null &&
    midRes.ok === true && resolved === 1 && after.hold_at === null &&
    resAfter.hold_resolution === 'PROVEN_OCCURRED' && !pending.some(m => m.mission_id === mid),
    `rehold=${rec !== null} complete_ret=${ret} ack_status=${midRow.status} sweep=${resolved} resolution=${resAfter && resAfter.hold_resolution} redispatchable=${pending.some(m => m.mission_id === mid)}`);
}
// H3b corrected: held in 'assigned' -> real complete() lands
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const S = mkSched(R, []);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'h3b2' }, { tenant_id: TENANT });
  await R.assign(mid, 'w');
  await R.markHold(mid, 'held in assigned');
  await R.complete(mid, { ok: true });
  const row = await rowOf(pool, mid);
  const resolved = await S.reconcileHeldMissions();
  check('H3b-corrected', row.status === 'completed' && resolved === 1,
    `ack_status=${row.status} sweep_resolved=${resolved}`);
}
// H3c corrected: stale ack after PNO matches 0 rows (row unchanged)
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const S = mkSched(R, []);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'h3c2' }, { tenant_id: TENANT });
  await R.assign(mid, 'w'); await R.start(mid);
  await R.markHold(mid, 'hold');
  await R.resolveHold(mid, 'PROVEN_NOT_OCCURRED');
  const before = await rowOf(pool, mid);
  await R.complete(mid, { ok: true, stale: 1 });
  const after = await rowOf(pool, mid);
  check('H3c-corrected',
    after.status === 'created' && after.hold_at === null && String(after.result) === String(before.result),
    `status=${after.status} hold_at=NULL result_untouched=${String(after.result) === String(before.result)}`);
}
// H5c: bare-ID legacy call shape after operator PNO -> stands down via H1
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'h5c2' }, { tenant_id: TENANT });
  await R.assign(mid, 'w'); await R.start(mid);
  await R.markHold(mid, 'hold');
  await R.resolveHold(mid, 'PROVEN_NOT_OCCURRED');
  const recovered = await S._recoverLostHold(mid, 'legacy bare-id');
  const row = await rowOf(pool, mid);
  check('H5c-bare-id', recovered === false && row.hold_at === null &&
    captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length === 0,
    `recovered=${recovered} HOLD_events=0`);
}
console.log(`=== RERUN2: ${pass} pass, ${fail} fail ===`);
process.exit(fail ? 1 : 0);
