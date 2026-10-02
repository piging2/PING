#!/usr/bin/env node
/**
 * E3 hostile proofs (Mission E3, 2026-09-27): Falsifier-E2's five findings,
 * re-run against the E3-repaired bytes to prove each fix.
 *
 * FIX-1 (H2): after one operator PROVEN_NOT_OCCURRED in the same scheduler
 *   session, a second unknown outcome must EMIT a fresh HOLD (not null).
 * FIX-2 (liveness): a held row CAN reach resolution: (a) late ack via
 *   complete() on a held row resolves through the sweep; (b) an aged hold
 *   with no proven outcome is escalated (alert), never silently permanent;
 *   (c) the operator interface exists (CLI + runbook, real invocation path).
 * FIX-3 (H1 narrow): a KNOWN-failed row (reclaimRetryPending commits inside
 *   the recovery re-read window) must NOT be mis-held as OUTCOME UNKNOWN.
 * FIX-4 (H3): a row re-held as 'created' by C1-recovery must be resolvable
 *   when a late ack arrives via complete().
 * FIX-5 (H5 narrow): a stale cross-session reconciler must stand down when
 *   its re-read lands after an operator PNO release (no re-hold, no event).
 *
 * Exit 0 = all fixes hold. Uses staged live bytes (PGlite synthetic DB).
 */
import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
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
  const pool = {
    async query(sql, params = []) {
      const stmts = String(sql).split(';').map(s => s.trim()).filter(Boolean);
      let last = null;
      for (const s of stmts) { last = await db.query(s, params); params = []; }
      return last;
    },
  };
  return { pool };
}
async function rowOf(pool, id) {
  const r = await pool.query(
    `SELECT mission_id, status, hold_at, hold_reason, retries, retry_at, result FROM ping_missions WHERE mission_id=$1`, [id]);
  return r.rows[0];
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---- FIX-1 (H2): PNO then a second unknown outcome -> fresh HOLD emitted ----
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3H2' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation'); await R.start(mid);
  const snap1 = await R.getMission(mid);
  const rec1 = await S._reconcileUnknown(snap1, 'observation', 'E3H2 first unknown');
  const pno = await R.resolveHold(mid, 'PROVEN_NOT_OCCURRED'); // operator release (bypasses scheduler memory)
  await R.assign(mid, 'w2'); await R.start(mid);               // exactly one new attempt
  const snap2 = await R.getMission(mid);
  const rec2 = await S._reconcileUnknown(snap2, 'w2', 'E3H2 second unknown');
  const holdEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length;
  const row2 = await rowOf(pool, mid);
  await expireLease(pool, mid);
  const reaped = await R.reapExpiredLeases();
  const pending = await R.getPending(10);
  check('E3H2-second-unknown-reholds',
    !!rec1 && pno === 1 && rec2 !== null && holdEvents === 2 && row2.hold_at !== null &&
    reaped === 0 && !pending.some(m => m.mission_id === mid),
    `hold1=${!!rec1} pno=${pno} second_reconcile=${rec2 !== null ? 'HOLD' : 'null'} HOLD_events=${holdEvents} ` +
    `hold_at=${row2.hold_at !== null ? 'SET' : 'NULL'} reaped=${reaped} pending_excludes=${!pending.some(m => m.mission_id === mid)}`);
}

// ---- FIX-4 (H3): re-held-as-created row resolves on late ack via complete() ----
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3H3' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation'); await R.start(mid);
  await expireLease(pool, mid);
  const reaped0 = await R.reapExpiredLeases(); // reaper wins -> created
  const h = await R.markHold(mid, 'E3H3: C1-recovery re-hold as created');
  await R.complete(mid, { ok: true, charge_id: 'ch_9' }); // late ack via the real complete()
  const row = await rowOf(pool, mid);
  const res = typeof row.result === 'string' ? JSON.parse(row.result) : row.result;
  const resolved = await S.reconcileHeldMissions();
  const rowAfter = await rowOf(pool, mid);
  const resAfter = typeof rowAfter.result === 'string' ? JSON.parse(rowAfter.result) : rowAfter.result;
  check('E3H3-late-ack-resolves-created-hold',
    reaped0 === 1 && h === 1 && row.status === 'completed' && res && res.charge_id === 'ch_9' &&
    resolved === 1 && rowAfter.hold_at === null && rowAfter.status === 'completed' &&
    resAfter.hold_resolution === 'PROVEN_OCCURRED',
    `reaped=${reaped0} rehold=${h} ack_landed_status=${row.status} sweep_resolved=${resolved} ` +
    `hold_cleared=${rowAfter.hold_at === null} resolution=${resAfter.hold_resolution}`);

  // H3 safety: a stale ack AFTER an operator PNO still matches 0 rows
  const midS = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3H3s' }, { tenant_id: TENANT });
  await R.assign(midS, 'observation'); await R.start(midS);
  await R.markHold(midS, 'E3H3s: hold then PNO');
  await R.resolveHold(midS, 'PROVEN_NOT_OCCURRED'); // operator release -> created, unheld
  await R.complete(midS, { ok: true, stale: 'attempt-1-ack' }); // stale ack from the old attempt
  const rowS = await rowOf(pool, midS);
  check('E3H3-stale-ack-after-pno-noop',
    rowS.status === 'created' && rowS.hold_at === null,
    `status=${rowS.status} hold_at=${rowS.hold_at === null ? 'NULL' : 'SET'} (stale ack must not complete the released row)`);
}

// ---- FIX-2a (liveness, late ack): covered by E3H3 above; FIX-2b (aging/escalation) ----
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured); // default 24h threshold
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3L2' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation'); await R.start(mid);
  await R.markHold(mid, 'E3L2: true-unknown hold, no ack ever comes');
  await pool.query(`UPDATE ping_missions SET hold_at = NOW() - INTERVAL '25 hours' WHERE mission_id=$1`, [mid]);
  const resolved = await S.reconcileHeldMissions();
  const row = await rowOf(pool, mid);
  const escEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD' && e.d && e.d.escalated === true);
  const stats = S.getStats();
  const resolved2 = await S.reconcileHeldMissions(); // second sweep: no duplicate escalation
  const escEvents2 = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD' && e.d && e.d.escalated === true);
  check('E3L2-aged-hold-escalated-not-silenced',
    resolved === 0 && row.hold_at !== null && escEvents.length === 1 &&
    escEvents[0].d.holdAgeMs > 86400000 && stats.holdsEscalated === 1 &&
    resolved2 === 0 && escEvents2.length === 1,
    `resolved=${resolved} hold_stands=${row.hold_at !== null} escalations=${escEvents.length} ` +
    `holdAgeMs>${Math.round((escEvents[0] && escEvents[0].d.holdAgeMs) / 3600000)}h holdsEscalated=${stats.holdsEscalated} ` +
    `second_sweep_no_dup=${escEvents2.length === 1}`);

  // fresh hold (under threshold) is NOT escalated
  const midF = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3L2f' }, { tenant_id: TENANT });
  await R.assign(midF, 'observation'); await R.start(midF);
  await R.markHold(midF, 'E3L2f: fresh hold');
  const nBefore = captured.length;
  await S.reconcileHeldMissions();
  check('E3L2f-fresh-hold-not-escalated',
    captured.length === nBefore,
    `no escalation emission for a fresh hold`);
}

// ---- FIX-2c (operator interface): CLI + runbook exist and are real ----
{
  const cliPath = path.join(ORCH, 'resolve-hold-cli.js');
  const rbPath = path.join(ORCH, 'HOLD_OPERATOR_RUNBOOK.md');
  const cliExists = fs.existsSync(cliPath);
  const rbExists = fs.existsSync(rbPath);
  let helpOut = '';
  try {
    // The CLI requires ./mission_runtime.js (the real repo layout). Test it in
    // a temp dir mirroring that layout with the staged patched bytes.
    const tmpd = fs.mkdtempSync('/tmp/e3cli-');
    fs.copyFileSync(cliPath, path.join(tmpd, 'resolve-hold-cli.js'));
    fs.copyFileSync(path.join(ORCH, 'mission_runtime.patched.cjs'), path.join(tmpd, 'mission_runtime.js'));
    helpOut = execFileSync('node', [path.join(tmpd, 'resolve-hold-cli.js'), 'help'], { encoding: 'utf8' });
    fs.rmSync(tmpd, { recursive: true, force: true });
  } catch (e) { helpOut = ''; }
  const rb = rbExists ? fs.readFileSync(rbPath, 'utf8') : '';
  check('E3L2c-operator-interface-real',
    cliExists && rbExists &&
    /PROVEN_NOT_OCCURRED/.test(helpOut) && /MANUAL_RESOLUTION/.test(helpOut) &&
    rb.includes('resolve-hold-cli.js') && rb.includes('PROVEN_NOT_OCCURRED'),
    `cli=${cliExists} runbook=${rbExists} help_lists_resolutions=${/PROVEN_NOT_OCCURRED/.test(helpOut)}`);
}

// ---- FIX-3 (H1 narrow): known-failed row must not be mis-held ----
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const captured = []; const S = mkSched(R, captured);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3H1' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation'); await R.start(mid);
  await R.failWithRetry(mid, 'worker at capacity', { max_attempts: 3, backoff_delay_ms: 1 }); // KNOWN failure
  await sleep(20);
  const staleSnap = { ...(await R.getMission(mid)), status: 'running' };
  const origGet = R.getMission.bind(R);
  R.getMission = async (id) => { await R.reclaimRetryPending(); return origGet(id); }; // hostile interleave
  const rec = await S._reconcileUnknown(staleSnap, 'observation', 'E3H1 stale snapshot');
  R.getMission = origGet;
  const row = await rowOf(pool, mid);
  const holdEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length;
  const pending = await R.getPending(10);
  check('E3H1-known-failed-not-misheld',
    rec === null && holdEvents === 0 && row.hold_at === null && row.status === 'created' &&
    pending.some(m => m.mission_id === mid),
    `returned=${rec} HOLD_events=${holdEvents} hold_at=${row.hold_at === null ? 'NULL' : 'SET'} ` +
    `status=${row.status} retry_path_dispatchable=${pending.some(m => m.mission_id === mid)}`);
}

// ---- FIX-5 (H5 narrow): stale reconciler stands down after operator PNO ----
{
  const { pool } = await freshPool();
  const R = new MissionRuntime({ pool }); await R.initialize();
  const capA = []; const SA = mkSched(R, capA);
  const capC = []; const SC = mkSched(R, capC);
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-E3H5' }, { tenant_id: TENANT });
  await R.assign(mid, 'observation'); await R.start(mid);
  const snapA = await R.getMission(mid);
  await SA._reconcileUnknown(snapA, 'observation', 'E3H5 session A hold');
  const staleSnapC = await R.getMission(mid); // session C snapshot while held
  const origGet = R.getMission.bind(R);
  let armed = true;
  R.getMission = async (id) => {
    if (armed) { armed = false; await R.resolveHold(id, 'PROVEN_NOT_OCCURRED'); } // operator releases mid-recovery
    return origGet(id);
  };
  const recC = await SC._reconcileUnknown(staleSnapC, 'observation', 'E3H5 session C stale');
  R.getMission = origGet;
  const row = await rowOf(pool, mid);
  const holdEventsC = capC.filter(e => e.t === 'MISSION_RECONCILE_HOLD').length;
  const pending = await R.getPending(10);
  check('E3H5-stale-reconciler-stands-down',
    recC === null && holdEventsC === 0 && row.hold_at === null && row.status === 'created' &&
    pending.some(m => m.mission_id === mid),
    `C_record=${recC} C_HOLD_events=${holdEventsC} hold_at=${row.hold_at === null ? 'NULL' : 'SET'} ` +
    `status=${row.status} operator_release_dispatchable=${pending.some(m => m.mission_id === mid)}`);
}

console.log(`\n${pass}/${pass + fail} E3 hostile checks passed.`);
process.exit(fail === 0 ? 0 : 1);
