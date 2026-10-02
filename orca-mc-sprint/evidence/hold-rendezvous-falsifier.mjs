#!/usr/bin/env node
/**
 * FALSIFIER-E proof: HOLD reaper patch rendezvous suite.
 *
 * CLAIM UNDER TEST (Mission E, 2026-09-27): the constitutional HOLD defect is
 * fixed — the scheduler's _reconcileUnknown() persisted HOLD only in memory,
 * so reapExpiredLeases() reset the row to 'created' on lease expiry and
 * re-dispatched: automatic retry of an unknown-outcome mission (2 effects
 * for 1 mission). The patch adds durable hold_at/hold_reason columns,
 * `AND hold_at IS NULL` on every dispatch-eligibility path, markHold
 * (conditional, idempotent) and resolveHold (only exit).
 *
 * WHAT THIS SCRIPT DOES (independent re-derivation; the worker's
 * /tmp/holdproof/rendezvous.mjs is gone):
 *   Phase A — FAIL-BEFORE: reconstruct HEAD (unpatched) bytes from git and
 *             run a synthetic rendezvous kill (worker crosses the effect
 *             boundary, killed before ack, lease expired, sweeps) -> expect
 *             the duplicate effect (2 effects for 1 mission).
 *   Phase B — PASS-AFTER: run the rendezvous suite against the LIVE patched
 *             file bytes -> expect exactly 1 effect across kill/expiry/
 *             sweeps/restart/concurrent reapers; resolveHold semantics.
 *   Phase C — RACE-HUNT: interleavings the patch must survive. Uses the
 *             LIVE patched MissionScheduler bytes for _reconcileUnknown.
 *   Phase D — STATIC GUARD AUDIT: enumerate every dispatch-eligibility path
 *             in the patched runtime bytes and verify the hold guard.
 *
 * DB: PGlite (ephemeral, in-process Postgres). No live DB, no external svc.
 * Staged bytes: ./holdproof-stage/ (hash-verified against the Pig; see
 * MANIFEST.json). Only mission_runtime.*.cjs / mission_scheduler.js /
 * failure_record.js are live bytes; constitutional_time_authority.js is a
 * clock-surface stub (documented in the stage dir).
 *
 * Exit code: 0 = the script ran to completion (its verdict is printed).
 * The verdict on the CLAIM is printed, not encoded in the exit code.
 */
import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STAGE = path.join(HERE, 'holdproof-stage');
const ORCH = path.join(STAGE, 'ping-runtime', 'orchestration');
const requireCjs = createRequire(import.meta.url);

const HeadRuntime = requireCjs(path.join(ORCH, 'mission_runtime.head.cjs')).MissionRuntime;
const PatchedRuntime = requireCjs(path.join(ORCH, 'mission_runtime.patched.cjs')).MissionRuntime;
const { MissionScheduler } = requireCjs(path.join(ORCH, 'mission_scheduler.js'));

const TENANT = 'test-tenant';
const results = [];
function verdict(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`);
}

// ---- PGlite pool adapter (MissionRuntime speaks pg.Pool.query) ----
async function freshPool() {
  const db = new PGlite();
  const pool = {
    async query(sql, params = []) {
      // initialize() ships multi-statement DDL; PGlite takes one statement
      // per query. Split is safe: the DDL has no semicolons in literals.
      const stmts = String(sql).split(';').map(s => s.trim()).filter(Boolean);
      let last = null;
      for (const s of stmts) { last = await db.query(s, params); params = []; }
      return last; // PGlite result carries .rows and .rowCount
    },
  };
  return { db, pool };
}

// ---- synthetic external-effect boundary ----
const effects = [];
const crossEffectBoundary = (missionId, attempt) => { effects.push({ missionId, attempt }); };
const effectCount = (id) => effects.filter(e => e.missionId === id).length;

async function rowOf(pool, id) {
  const r = await pool.query(
    `SELECT mission_id, status, hold_at, hold_reason, assigned_to, lease_until, retries, result
     FROM ping_missions WHERE mission_id = $1`, [id]);
  return r.rows[0];
}
async function expireLease(pool, id) {
  await pool.query(`UPDATE ping_missions SET lease_until = NOW() - INTERVAL '1 second' WHERE mission_id = $1`, [id]);
}
// worker: assign -> start -> EFFECT -> killed before ack (no complete())
async function rendezvousKill(R, missionId, worker, holdFn) {
  await R.assign(missionId, worker);
  await R.start(missionId);
  crossEffectBoundary(missionId, 'attempt-1');
  await holdFn(missionId);
}
const memOnlyHold = async () => { /* unpatched: HOLD kept only in scheduler memory */ };

// =====================================================================
console.log('--- Phase A: FAIL-BEFORE (HEAD/unpatched bytes) ---');
{
  const { pool } = await freshPool();
  const R = new HeadRuntime({ pool });
  await R.initialize();
  if (typeof R.markHold === 'function') throw new Error('HEAD runtime unexpectedly has markHold');
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-A1' }, { tenant_id: TENANT });
  await rendezvousKill(R, mid, 'observation', memOnlyHold); // effect #1, no durable hold
  await expireLease(pool, mid);
  const reaped = await R.reapExpiredLeases();               // unguarded reaper
  const pending = await R.getPending(10);
  const claimed = pending.length ? await R.assign(pending[0].mission_id, 'observation') : 0;
  if (claimed) { await R.start(mid); crossEffectBoundary(mid, 'attempt-2'); } // effect #2
  const n = effectCount(mid);
  verdict('A1-fail-before-duplicate', n === 2 && reaped === 1 && claimed === 1,
    `reaped=${reaped} claimed=${claimed} effects=${n} (defect: 2 effects for 1 mission)`);
}

// =====================================================================
console.log('--- Phase B: PASS-AFTER (live patched bytes) ---');
let Bpool, BR;
{
  ({ pool: Bpool } = await freshPool());
  BR = new PatchedRuntime({ pool: Bpool });
  await BR.initialize();

  // B1: kill/expiry/sweeps/restart -> exactly 1 effect, hold durable
  const mid = await BR.create('OBSERVATION_CREATE', { event_id: 'evt-B1' }, { tenant_id: TENANT });
  let held = 0;
  await rendezvousKill(BR, mid, 'observation', async (id) => { held = await BR.markHold(id, 'rendezvous: unknown outcome'); });
  await expireLease(Bpool, mid);
  const reaped = await BR.reapExpiredLeases();
  const reclaimed = await BR.reclaimRetryPending();
  const stuck = await BR.findStuckRunning(new Date(Date.now() + 60000).toISOString());
  const pending = await BR.getPending(10);
  const claimed = await BR.assign(mid, 'observation');
  // "restart": brand-new runtime instance over the same rows
  const BR2 = new PatchedRuntime({ pool: Bpool });
  await BR2.initialize();
  const reaped2 = await BR2.reapExpiredLeases();
  const pending2 = await BR2.getPending(10);
  const row = await rowOf(Bpool, mid);
  verdict('B1-hold-survives-kill-expiry-sweeps-restart',
    held === 1 && reaped === 0 && reclaimed === 0 && !stuck.some(r => r.mission_id === mid) &&
    pending.length === 0 && claimed === 0 && reaped2 === 0 && pending2.length === 0 &&
    row.hold_at !== null && effectCount(mid) === 1,
    `markHold=${held} reaped=${reaped}/${reaped2} pending=${pending.length}/${pending2.length} ` +
    `claimed=${claimed} hold_at=${row.hold_at !== null ? 'SET' : 'NULL'} effects=${effectCount(mid)}`);

  // B2: concurrent reapers on an already-held mission
  const [c1, c2] = await Promise.all([BR.reapExpiredLeases(), BR2.reapExpiredLeases()]);
  verdict('B2-concurrent-reapers-on-held', c1 === 0 && c2 === 0, `reaped=${c1},${c2}`);

  // B3: PROVEN_OCCURRED -> completed, result adopted, never re-dispatched
  const r3 = await BR.resolveHold(mid, 'PROVEN_OCCURRED', { proof: 'ledger-shows-charge' });
  const row3 = await rowOf(Bpool, mid);
  const res3 = typeof row3.result === 'string' ? JSON.parse(row3.result) : row3.result;
  const p3 = await BR.getPending(10);
  const a3 = await BR.assign(mid, 'observation');
  verdict('B3-proven-occurred-terminal',
    r3 === 1 && row3.status === 'completed' && row3.hold_at === null &&
    res3 && res3.hold_resolution === 'PROVEN_OCCURRED' && res3.proof === 'ledger-shows-charge' &&
    p3.length === 0 && a3 === 0 && effectCount(mid) === 1,
    `resolved=${r3} status=${row3.status} hold_cleared=${row3.hold_at === null} effects=${effectCount(mid)}`);

  // B4: PROVEN_NOT_OCCURRED -> created, exactly one new attempt, then terminal
  const mid2 = await BR.create('OBSERVATION_CREATE', { event_id: 'evt-B4' }, { tenant_id: TENANT });
  await BR.assign(mid2, 'observation');
  await BR.start(mid2);
  // worker hung BEFORE crossing the effect boundary; reconciler proves no effect
  const h4 = await BR.markHold(mid2, 'rendezvous: proven no effect');
  const r4 = await BR.resolveHold(mid2, 'PROVEN_NOT_OCCURRED');
  const row4 = await rowOf(Bpool, mid2);
  const p4 = await BR.getPending(10);
  const attempts = await Promise.all([BR.assign(mid2, 'w-a'), BR.assign(mid2, 'w-b'), BR.assign(mid2, 'w-c')]);
  const winners = attempts.filter(x => x === 1).length;
  await BR.start(mid2);
  crossEffectBoundary(mid2, 'attempt-2');
  await BR.complete(mid2, { ok: true });
  const row4b = await rowOf(Bpool, mid2);
  const a4b = await BR.assign(mid2, 'observation');
  verdict('B4-proven-not-occurred-one-new-attempt',
    h4 === 1 && r4 === 1 && row4.status === 'created' && row4.hold_at === null &&
    row4.assigned_to === null && p4.some(m => m.mission_id === mid2) && winners === 1 &&
    effectCount(mid2) === 1 && row4b.status === 'completed' && a4b === 0,
    `hold=${h4} resolve=${r4} post_status=${row4.status} claim_winners=${winners} ` +
    `effects=${effectCount(mid2)} terminal=${row4b.status}`);

  // B5: unknown resolution throws (fail closed)
  let threw = null;
  try { await BR.resolveHold(mid2, 'BOGUS_RESOLUTION'); } catch (e) { threw = e.message; }
  verdict('B5-unknown-resolution-throws', !!threw && /unknown resolution/.test(threw), `threw=${!!threw}`);

  // B6: resolving a non-held mission is a no-op
  const mid3 = await BR.create('OBSERVATION_CREATE', { event_id: 'evt-B6' }, { tenant_id: TENANT });
  const r6 = await BR.resolveHold(mid3, 'PROVEN_OCCURRED', { x: 1 });
  const row6 = await rowOf(Bpool, mid3);
  verdict('B6-resolve-non-held-noop', r6 === 0 && row6.status === 'created' && row6.hold_at === null,
    `resolved=${r6} status=${row6.status}`);

  // B7: markHold idempotent
  await BR.assign(mid3, 'observation');
  const h7a = await BR.markHold(mid3, 'r1');
  const h7b = await BR.markHold(mid3, 'r2');
  const row7 = await rowOf(Bpool, mid3);
  verdict('B7-markhold-idempotent', h7a === 1 && h7b === 0 && row7.hold_reason === 'r1',
    `first=${h7a} second=${h7b} reason_kept=${row7.hold_reason}`);
}

// =====================================================================
console.log('--- Phase C: RACE-HUNT (live patched runtime + live patched scheduler) ---');
{
  const { pool } = await freshPool();
  const R = new PatchedRuntime({ pool });
  await R.initialize();

  const captured = [];
  const markHoldReturns = [];
  // wrap markHold to observe its rowCount (the scheduler ignores it)
  const origMarkHold = R.markHold.bind(R);
  R.markHold = async (id, reason) => { const n = await origMarkHold(id, reason); markHoldReturns.push(n); return n; };
  const S = new MissionScheduler({
    missionRuntime: R,
    workerRuntime: { getStats: () => ({ workers: {} }), dispatch: async () => { throw new Error('not used'); } },
    eventRuntime: { emit: async (t, s, d) => { captured.push({ t, s, d }); } },
  });

  // C1: lease expiry racing reconciliation — REAPER WINS the commit order.
  // Two schedulers: B runs Arrow 1 (reap) while A runs Arrow 3 (watchdog).
  // Under READ COMMITTED each UPDATE is atomic; the outcome depends only on
  // commit order. The sequential run below reproduces the reaper-wins commit
  // order exactly (the loser's UPDATE re-evaluates its WHERE on the winner's
  // committed row version — identical to the concurrent case; lock-wait
  // blocking changes timing, not the outcome).
  const mid = await R.create('OBSERVATION_CREATE', { event_id: 'evt-C1' }, { tenant_id: TENANT });
  await rendezvousKill(R, mid, 'observation', memOnlyHold); // effect #1, no hold yet
  await expireLease(pool, mid);
  const snap = (await R.findStuckRunning(new Date(Date.now() + 60000).toISOString()))
    .find(r => r.mission_id === mid);                       // A's watchdog snapshot (pre-reap)
  const reaped = await R.reapExpiredLeases();               // B's reaper commits first
  await S._reconcileUnknown(snap, 'observation',           // A's reconciler runs on the stale snapshot
    `stuck in 'running' (watchdog)`);
  const holdEvents = captured.filter(e => e.t === 'MISSION_RECONCILE_HOLD' && e.d.missionId === mid);
  const rowC = await rowOf(pool, mid);
  const pendingC = await R.getPending(10);
  const claimedC = pendingC.some(m => m.mission_id === mid) ? await R.assign(mid, 'observation') : 0;
  if (claimedC) { await R.start(mid); crossEffectBoundary(mid, 'attempt-2'); } // effect #2
  const lostHold = markHoldReturns[markHoldReturns.length - 1] === 0;
  const dupEffect = effectCount(mid) === 2;
  verdict('C1-reaper-wins-race',
    !(lostHold && holdEvents.length > 0 && dupEffect),
    `reaped=${reaped} markHold->${markHoldReturns[markHoldReturns.length - 1]}(IGNORED) ` +
    `HOLD_events=${holdEvents.length} hold_at=${rowC.hold_at === null ? 'NULL(lost)' : 'SET'} ` +
    `redispatched=${claimedC === 1} effects=${effectCount(mid)} ` +
    (lostHold && holdEvents.length > 0 && dupEffect
      ? '=> FALSIFICATION: HOLD event emitted for an un-held, re-dispatchable mission; 2 effects for 1 mission'
      : '=> race survived'));

  // C1b: reverse commit order (markHold wins) is safe — shows order dependence
  const midB = await R.create('OBSERVATION_CREATE', { event_id: 'evt-C1b' }, { tenant_id: TENANT });
  await rendezvousKill(R, midB, 'observation', async (id) => { await R.markHold(id, 'hold-first'); });
  await expireLease(pool, midB);
  const reapedB = await R.reapExpiredLeases();
  const rowB = await rowOf(pool, midB);
  const pendB = await R.getPending(10);
  verdict('C1b-markhold-wins-safe', reapedB === 0 && rowB.hold_at !== null &&
    !pendB.some(m => m.mission_id === midB) && effectCount(midB) === 1,
    `reaped=${reapedB} hold_at=SET pending_excludes=${!pendB.some(m => m.mission_id === midB)}`);

  // C2: markHold racing markHold — second is a no-op, single hold stands
  const mid2 = await R.create('OBSERVATION_CREATE', { event_id: 'evt-C2' }, { tenant_id: TENANT });
  await R.assign(mid2, 'observation');
  const [m1, m2] = [await R.markHold(mid2, 'r1'), await R.markHold(mid2, 'r2')];
  const row2 = await rowOf(pool, mid2);
  verdict('C2-markhold-vs-markhold', m1 === 1 && m2 === 0 && row2.hold_at !== null,
    `first=${m1} second=${m2} hold=SET`);

  // C3: resolveHold(PROVEN_NOT_OCCURRED) racing sweeps — exactly one new attempt
  const mid3 = await R.create('OBSERVATION_CREATE', { event_id: 'evt-C3' }, { tenant_id: TENANT });
  await R.assign(mid3, 'observation');
  await R.start(mid3);
  await R.markHold(mid3, 'c3');
  const rs = await R.resolveHold(mid3, 'PROVEN_NOT_OCCURRED');
  const sweeps = await Promise.all([
    R.reapExpiredLeases(), R.reclaimRetryPending(),
    R.assign(mid3, 'w-x'), R.assign(mid3, 'w-y'),
  ]);
  const claimWins = sweeps.filter(x => x === 1).length;
  verdict('C3-resolve-racing-sweep', rs === 1 && claimWins === 1,
    `resolved=${rs} concurrent_claim_winners=${claimWins}`);
}

// =====================================================================
console.log('--- Phase D: STATIC GUARD-COMPLETENESS AUDIT (patched runtime bytes) ---');
{
  const src = fs.readFileSync(path.join(STAGE, 'mission_runtime.PATCHED.js'), 'utf8');
  // enumerate every SQL statement issued against ping_missions
  const qres = [];
  const re = /\.query\(\s*`([\s\S]*?)`\s*(?:,\s*\[[\s\S]*?\])?\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const sql = m[1].replace(/\s+/g, ' ').trim();
    if (/ping_missions/i.test(sql)) qres.push(sql);
  }
  const setsCreated = qres.filter(s => /SET\s+status\s*=\s*'created'/i.test(s));
  const setsOther = qres.filter(s => /UPDATE\s+ping_missions\s+SET/i.test(s) && !/SET\s+status\s*=\s*'created'/i.test(s));
  const selects = qres.filter(s => /^\s*SELECT/i.test(s));
  console.log(`  statements touching ping_missions: ${qres.length}`);
  console.log('  -- every UPDATE that can produce a dispatchable (created) row:');
  let d1 = true;
  for (const s of setsCreated) {
    const guarded = /hold_at IS NULL/i.test(s);
    const isResolveHold = /hold_at\s*=\s*NULL/i.test(s);
    const ok = guarded || isResolveHold;
    if (!ok) d1 = false;
    console.log(`  [${ok ? 'GUARDED/AUTH' : 'UNGUARDED!!'}] ${s.slice(0, 130)}...`);
  }
  console.log('  -- other UPDATEs on ping_missions (guard status; must not create dispatchability):');
  for (const s of setsOther) {
    const guarded = /hold_at IS NULL/i.test(s) || /hold_at\s*=\s*NULL/i.test(s) || /hold_at\s*=\s*NOW\(\)/i.test(s);
    console.log(`  [${guarded ? 'hold-aware' : 'no-guard'}] ${s.slice(0, 130)}...`);
  }
  console.log('  -- SELECTs feeding dispatch/watchdog:');
  for (const s of selects) {
    if (/status\s*=\s*'created'/i.test(s) || /status IN \('running', 'assigned'\)/i.test(s)) {
      const guarded = /hold_at IS NULL/i.test(s);
      console.log(`  [${guarded ? 'GUARDED' : 'UNGUARDED!!'}] ${s.slice(0, 130)}...`);
    }
  }
  // ONLY-EXIT: writers of hold_at
  const setters = (src.match(/SET hold_at = NOW\(\)/g) || []).length;
  const clearers = (src.match(/SET hold_at = NULL/g) || []).length;
  const clearerOutsideResolve = /async (?!resolveHold)[a-zA-Z]+\([^)]*\)\s*{[^}]*SET hold_at = NULL/s.test(src);
  console.log(`  hold_at writers: SET NOW() x${setters} (markHold), SET NULL x${clearers} (resolveHold branches)`);
  verdict('D1-guard-completeness', d1, `all created-producing UPDATEs guarded or authorized`);
  verdict('D2-only-exit', setters === 1 && clearers === 3 && !clearerOutsideResolve,
    `only markHold sets, only resolveHold clears (3 branches)`);

  // NO-REGRESSION: event types
  const evts = [...src.matchAll(/\.emit\('([A-Z_]+)'/g)].map(x => x[1]);
  const sched = fs.readFileSync(path.join(ORCH, 'mission_scheduler.js'), 'utf8');
  const sevts = [...sched.matchAll(/\.emit\('([A-Z_]+)'/g)].map(x => x[1]);
  const expected = ['MISSION_CREATED','MISSION_ASSIGNED','MISSION_STARTED','MISSION_COMPLETED',
    'MISSION_FAILED','MISSION_LEASE_EXPIRED','MISSION_RETRY_RECLAIMED'];
  const uniq = [...new Set(evts)];
  const same = expected.length === uniq.length && expected.every(e => uniq.includes(e));
  verdict('D3-no-new-event-types',
    same && sevts.length === 1 && sevts[0] === 'MISSION_RECONCILE_HOLD',
    `runtime=[${[...new Set(evts)].join(',')}] scheduler=[${sevts.join(',')}]`);
}

// =====================================================================
console.log('\n=== SUMMARY ===');
const fails = results.filter(r => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}`);
console.log(`\n${results.length - fails.length}/${results.length} checks passed.`);
const c1 = results.find(r => r.id === 'C1-reaper-wins-race');
if (c1 && !c1.ok) {
  console.log('VERDICT: CLAIM FALSIFIED.');
  console.log('C1 evidence: when the reaper commit wins the race against the reconciler,');
  console.log('markHold() affects 0 rows (silently ignored by _reconcileUnknown), a');
  console.log('MISSION_RECONCILE_HOLD event is still emitted, and the mission is');
  console.log('re-dispatched: 2 effects for 1 mission on PATCHED bytes.');
} else if (fails.length === 0) {
  console.log('VERDICT: CLAIM HOLDS on all tested paths (commit may proceed).');
} else {
  console.log('VERDICT: mixed — see FAIL lines above.');
}
