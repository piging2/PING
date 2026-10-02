'use strict';
/**
 * T-06 harness driver for f01 (~/workspace/f01-fix/mission_runtime.js).
 *
 * HARNESS ONLY - NOT PRODUCT CODE. Drives the REAL f01 MissionRuntime
 * against the REAL FakePool with a controllable clock. Each exported
 * scenario returns { verdict, evidence[] } computed deterministically
 * from observed implementation outputs (no judgment calls, no mocks of
 * the implementation itself).
 *
 * Verdict rule: CORRECT unless a fixture-listed hostile outcome is
 * reachable through f01's own API (then INCORRECT), or the fixture is
 * at a seam f01 does not operate (then INAPPLICABLE, with the seam named).
 */
const { MissionRuntime } = require('/home/hatch/workspace/f01-fix/mission_runtime.js');
const { FakePool } = require('/home/hatch/workspace/f01-fix/fake_mission_pool.js');

function rig() {
  let now = Date.now();
  const pool = new FakePool({ now: () => now });
  const mr = new MissionRuntime({ pool });
  const advance = (ms) => { now += ms; };
  const row = (id) => pool.missions.get(id);
  const snap = (id) => JSON.stringify(row(id));
  return { pool, mr, advance, row, snap, now: () => now };
}

function ev(list, ok, text) { list.push(`${ok ? 'OK  ' : 'FAIL'} ${text}`); return ok; }

async function fullCycle(r, id) {
  // created -> assigned -> running -> dispatch attempt recorded
  await r.mr.assign(id, 'w1');
  await r.mr.start(id);
  const n = await r.mr.recordDispatchAttempt(id);
  return n;
}

/* Fixture 01: ack lost after a consequential dispatch. */
async function f01() {
  const r = rig(); const E = []; let pass = true;
  const id = await r.mr.create('email.send', { event_id: 't06-f1', to: 'customer@example.com' });
  const n = await fullCycle(r, id);
  pass = ev(E, n === 1, `dispatch attempt recorded, effect_count=${n}`) && pass;
  // Ack path fails -> park HOLD (the timeout/unknown-outcome path).
  const parked = await r.mr.parkHold(id, {
    dispatch_attempted_at: new Date(r.now()).toISOString(),
    ack: 'missing', effect: 'possibly_occurred', reconciler: 't06',
  });
  const m = r.row(id);
  pass = ev(E, parked === 1, `parkHold parked 1 row`) && pass;
  pass = ev(E, m.status === 'hold', `status=hold (got ${m.status})`) && pass;
  pass = ev(E, m.retry_eligibility === false, `retry_eligibility=FALSE (structural)`) && pass;
  pass = ev(E, m.reconciliation_required === true, `reconciliation_required=TRUE`) && pass;
  pass = ev(E, m.lease_until === null, `lease cleared (no reaper/renewal can touch it)`) && pass;
  pass = ev(E, m.outcome === 'UNKNOWN', `outcome=UNKNOWN`) && pass;
  // Scheduler cannot claim it, even twice; reaper cannot reap it; getPending hides it.
  pass = ev(E, (await r.mr.assign(id, 'sched2')) === 0, `assign() on HOLD row -> 0 rows`) && pass;
  pass = ev(E, (await r.mr.reapExpiredLeases()) === 0, `reapExpiredLeases -> 0 reclaimed`) && pass;
  pass = ev(E, (await r.mr.getPending(10)).every(x => x.mission_id !== id), `getPending() excludes HOLD row`) && pass;
  // Reconciliation PROVES EFFECT -> SUCCEEDED, effect_count still 1, never re-executed.
  const res = await r.mr.reconcileHold(id, 'succeeded', { evidence: { channel_receipt: 'msg-1', idem_key: 'k1' } });
  const m2 = r.row(id);
  pass = ev(E, res === true, `reconcileHold('succeeded', evidence) resolved`) && pass;
  pass = ev(E, m2.status === 'completed' && m2.outcome === 'SUCCEEDED', `completed/SUCCEEDED`) && pass;
  pass = ev(E, m2.effect_count === 1, `effect_count exactly 1 (no second execution)`) && pass;
  pass = ev(E, m2.reconciliation_required === false, `reconciliation_required cleared`) && pass;
  // Idempotent: a second resolution attempt matches zero rows.
  pass = ev(E, (await r.mr.reconcileHold(id, 'succeeded', { evidence: { x: 1 } })) === false,
    `second reconcileHold matches 0 rows (exactly one terminal transition)`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 02: lease expires while an effect may be in flight. */
async function f02() {
  const r = rig(); const E = []; let pass = true;
  // Row A: assigned AND started (worker began dispatch) with an expired lease.
  const a = await r.mr.create('email.send', { event_id: 't06-f2a' });
  await r.mr.assign(a, 'w1'); await r.mr.start(a); await r.mr.recordDispatchAttempt(a);
  r.advance(61 * 1000); // lease (60s) expires
  const reaped = await r.mr.reapExpiredLeases();
  const ra = r.row(a);
  pass = ev(E, reaped === 0, `narrowed reaper reclaimed 0 (started row refused created-reset)`) && pass;
  pass = ev(E, ra.status === 'running', `started row stays 'running' (got ${ra.status})`) && pass;
  const orphans = await r.mr.findOrphanedRunning();
  pass = ev(E, orphans.some(o => o.mission_id === a), `findOrphanedRunning surfaces the possibly-executed row`) && pass;
  pass = ev(E, (await r.mr.parkHold(a, { reason: 'lease_expired_possible_effect', reaper: 't06' })) === 1,
    `orphaned-started row parks as HOLD`) && pass;
  pass = ev(E, r.row(a).retry_eligibility === false, `parked HOLD retry_eligibility=FALSE`) && pass;
  // Control: a NEVER-STARTED assigned row with an expired lease IS legitimately reclaimed.
  const b = await r.mr.create('email.send', { event_id: 't06-f2b' });
  await r.mr.assign(b, 'w1'); // no start(): worker never invoked
  r.advance(61 * 1000);
  const reaped2 = await r.mr.reapExpiredLeases();
  pass = ev(E, reaped2 === 1 && r.row(b).status === 'created',
    `never-started expired-lease row reclaimed to created (legitimate case preserved)`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 03: worker killed after the effect landed, before ack. */
async function f03() {
  const r = rig(); const E = []; let pass = true;
  const id = await r.mr.create('form.submit', { event_id: 't06-f3' });
  await fullCycle(r, id); // effect_count=1; effect actually happened out here
  r.advance(61 * 1000);   // worker dead: lease expires unrenewed
  const orphans = await r.mr.findOrphanedRunning();
  pass = ev(E, orphans.some(o => o.mission_id === id), `dead worker's started row found by orphan detection`) && pass;
  pass = ev(E, (await r.mr.parkHold(id, { reason: 'orphaned_started', effect: 'may_have_occurred' })) === 1,
    `orphaned-started parks as HOLD (not FAILED)`) && pass;
  const m = r.row(id);
  pass = ev(E, m.status === 'hold' && m.outcome === 'UNKNOWN', `hold/UNKNOWN, not failed`) && pass;
  // The automatic fail path cannot touch a HOLD row (proven-failures-only).
  // (fail() returns undefined by API design; the observable is the row.)
  await r.mr.fail(id, 'worker died');
  const mf = r.row(id);
  pass = ev(E, mf.status === 'hold' && mf.outcome === 'UNKNOWN',
    `fail() on HOLD row matches 0 rows (status still hold, outcome still UNKNOWN)`) && pass;
  // Retry requires PROOF, not belief: safe_to_retry without proof throws.
  let threw = false;
  try { await r.mr.reconcileHold(id, 'safe_to_retry', { evidence: 'probably fine' }); }
  catch (e) { threw = e instanceof TypeError; }
  pass = ev(E, threw, `reconcileHold('safe_to_retry') without proof throws TypeError`) && pass;
  // PROVE ABSENCE path: effect_count corrected to 0, same identity, final count exactly 1.
  const ok = await r.mr.reconcileHold(id, 'safe_to_retry',
    { evidence: { provider_log: 'no receipt' }, effectProvenAbsent: true });
  const m2 = r.row(id);
  pass = ev(E, ok === true && m2.outcome === 'SAFE_TO_RETRY', `PROVE ABSENCE -> SAFE_TO_RETRY`) && pass;
  pass = ev(E, m2.effect_count === 0 && m2.retry_eligibility === true, `effect_count corrected 1->0, re-eligible`) && pass;
  pass = ev(E, m2.logical_operation_id === id, `identity stable (never reminted)`) && pass;
  await r.mr.assign(id, 'w2'); await r.mr.start(id);
  const n = await r.mr.recordDispatchAttempt(id);
  pass = ev(E, n === 1, `re-attempt brings effect_count to exactly 1`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 04: effect proven, result never journaled, worker dead. */
async function f04() {
  const r = rig(); const E = []; let pass = true;
  const id = await r.mr.create('payment.submit', { event_id: 't06-f4' });
  await fullCycle(r, id); // effect_count=1, effect PROVEN (receipt in hand)
  r.advance(61 * 1000);
  pass = ev(E, (await r.mr.parkHold(id, { reason: 'result_unjournaled', effect: 'proven' })) === 1,
    `proven-effect row parks as HOLD (retry_eligibility=FALSE)`) && pass;
  pass = ev(E, r.row(id).retry_eligibility === false, `no re-execution path while HOLD`) && pass;
  // Reconciliation recovers the result WITHOUT re-executing: succeeded with evidence.
  const ok = await r.mr.reconcileHold(id, 'succeeded',
    { evidence: { channel_receipt: 'pay-123', recovered_result: { ok: true } } });
  const m = r.row(id);
  pass = ev(E, ok === true, `reconcileHold('succeeded', evidence) resolved`) && pass;
  pass = ev(E, m.status === 'completed' && m.outcome === 'SUCCEEDED', `completed/SUCCEEDED`) && pass;
  pass = ev(E, m.effect_count === 1, `effect_count still 1 (effect never re-executed)`) && pass;
  pass = ev(E, !!(m.result && m.result.reconciled), `recovered result journaled on the row`) && pass;
  // Exactly one journaling: a second resolution matches zero rows.
  pass = ev(E, (await r.mr.reconcileHold(id, 'succeeded', { evidence: { x: 1 } })) === false,
    `result journaled exactly once (second resolve -> 0 rows)`) && pass;
  // Caveat probe (recorded, not verdict-driving): the 'failed' decision's
  // evidence is caller-trusted (non-empty check); the AUTOMATIC fail() path
  // excludes HOLD rows (proven in f03). The reconciler is the authorized actor
  // for the RECONCILE step, so evidence-content validation is caller-side.
  E.push('NOTE  reconcileHold evidence content is caller-attested (non-empty check); ' +
    'structural enforcement (only-reconciler, only-from-hold, evidence-required) holds; ' +
    'automatic fail() cannot touch HOLD (shown in fixture 03).');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 05: duplicate submission of the same intent. */
async function f05() {
  const r = rig(); const E = []; let pass = true;
  const id1 = await r.mr.create('email.send', { event_id: 't06-f5', to: 'c@example.com' });
  const id2 = await r.mr.create('email.send', { event_id: 't06-f5', to: 'c@example.com' });
  pass = ev(E, id1 === id2, `duplicate submission resolves to the same mission id`) && pass;
  pass = ev(E, r.pool.missions.size === 1, `exactly one logical mission row exists`) && pass;
  // Concurrent schedulers racing on the conditional claim: exactly one wins.
  const c1 = await r.mr.assign(id1, 'schedA');
  const c2 = await r.mr.assign(id1, 'schedB');
  pass = ev(E, c1 === 1 && c2 === 0, `conditional claim: first wins (1), second matches 0 rows`) && pass;
  const m = r.row(id1);
  pass = ev(E, m.assigned_to === 'schedA' && m.status === 'assigned', `single claim stands`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 06: zombie result from a superseded worker. */
async function f06() {
  const r = rig(); const E = []; let pass = true;
  // W1's attempt reconciled to SUCCEEDED; zombie complete() from W1 arrives late.
  const id = await r.mr.create('email.send', { event_id: 't06-f6' });
  await fullCycle(r, id);
  await r.mr.parkHold(id, { reason: 'w1_stalled' });
  await r.mr.reconcileHold(id, 'succeeded', { evidence: { receipt: 'w2' } });
  const before = r.snap(id);
  // (complete() returns undefined by API design; the observable is the row.)
  await r.mr.complete(id, { stale: 'w1-zombie-result' });
  pass = ev(E, r.snap(id) === before, `zombie complete() after SUCCEEDED reconcile matches 0 rows (row byte-identical)`) && pass;
  // HOLD window: zombie complete() while still HOLD cannot resolve it either.
  const h = await r.mr.create('email.send', { event_id: 't06-f6h' });
  await fullCycle(r, h);
  await r.mr.parkHold(h, { reason: 'still_hold' });
  await r.mr.complete(h, { stale: 'w1' });
  pass = ev(E, r.row(h).status === 'hold', `zombie complete() while HOLD matches 0 rows (still hold, not a resolution)`) && pass;
  // THE GAP: after PROVE-ABSENCE -> SAFE_TO_RETRY, the re-attempt runs as
  // 'running'; a zombie complete() landing in that window matches the
  // status='running' conditional and journals stale data. f01 has NO
  // fencing-token / claim-generation conditional (grep: zero hits).
  const g = await r.mr.create('email.send', { event_id: 't06-f6g' });
  await fullCycle(r, g);
  await r.mr.parkHold(g, { reason: 'w1_stalled' });
  await r.mr.reconcileHold(g, 'safe_to_retry', { evidence: { provider: 'no receipt' }, effectProvenAbsent: true });
  await r.mr.assign(g, 'w2'); await r.mr.start(g); // re-attempt in flight
  const preZombie = r.snap(g);
  await r.mr.complete(g, { stale: 'w1-zombie-result' }); // zombie W1 result lands here
  const mg = r.row(g);
  const resG = typeof mg.result === 'string' ? JSON.parse(mg.result) : mg.result;
  const hostile = r.snap(g) !== preZombie && mg.status === 'completed' &&
    !!(resG && resG.stale === 'w1-zombie-result');
  if (hostile) {
    E.push('HOSTILE zombie complete() during the SAFE_TO_RETRY re-attempt window ' +
      `matched the status='running' conditional (status now ${mg.status})`);
    E.push('HOSTILE stale zombie data became the journaled truth; f01 has no ' +
      'fencing-token / claim-generation conditional (grep: zero hits in f01).');
    pass = false;
  } else {
    E.push('OK   zombie complete() during re-attempt window matched 0 rows');
  }
  E.push('NOTE  f01 owns no attempt-fencing (no fencing-token CAS anywhere in ' +
    'mission_runtime.js / mission_scheduler.js); the status conditional covers ' +
    'zombie-vs-reconciled and zombie-vs-HOLD, but not the re-attempt window. ' +
    'The semantic register assigns fencing to attempt-fencing.ts (other impl).');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 07: scheduler restart (plus a concurrent second scheduler) with HOLD present. */
async function f07() {
  const r = rig(); const E = []; let pass = true;
  const id = await r.mr.create('email.send', { event_id: 't06-f7' });
  await fullCycle(r, id);
  await r.mr.parkHold(id, { reason: 'unknown_effect', notes: ['ack missing'] });
  const before = r.snap(id);
  // Restart: brand-new runtime + scheduler instances over the SAME store.
  const mr2 = new MissionRuntime({ pool: r.pool });
  const schedA = async () => mr2.assign(id, 'schedA');
  const schedB = async () => mr2.assign(id, 'schedB');
  const [a1, b1] = [await schedA(), await schedB()];
  pass = ev(E, a1 === 0 && b1 === 0, `neither scheduler can claim the HOLD row (0,0)`) && pass;
  pass = ev(E, (await mr2.getPending(10)).every(x => x.mission_id !== id), `post-restart getPending() hides HOLD`) && pass;
  pass = ev(E, (await mr2.reapExpiredLeases()) === 0, `post-restart reaper touches nothing (lease NULL)`) && pass;
  await mr2.initialize(); // boot path: must not reseed or "clean up" HOLD rows
  pass = ev(E, r.snap(id) === before, `HOLD row survives restart byte-identical`) && pass;
  pass = ev(E, r.pool.missions.size === 1, `no fresh 'created' row reminted for the held intent`) && pass;
  const m = r.row(id);
  pass = ev(E, m.retry_eligibility === false && m.reconciliation_required === true,
    `still retry_eligibility=FALSE, reconciliation_required=TRUE`) && pass;
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

/* Fixture 08: reconciler killed mid-reconciliation. */
async function f08() {
  const r = rig(); const E = []; let pass = true;
  const id = await r.mr.create('email.send', { event_id: 't06-f8' });
  await fullCycle(r, id);
  await r.mr.parkHold(id, { reason: 'unknown_effect', notes: ['receipt check started'] });
  // Reconciler gathers evidence, merges a note, then DIES before committing.
  const cont = await r.mr.reconcileHold(id, 'hold', { note: 'provider log checked: no receipt yet' });
  const m = r.row(id);
  pass = ev(E, cont === true, `continued-HOLD note merge committed`) && pass;
  pass = ev(E, m.status === 'hold' && m.retry_eligibility === false && m.reconciliation_required === true,
    `after crash: still HOLD, still non-dispatchable, still reconciliation_required`) && pass;
  pass = ev(E, m.hold_record && m.hold_record.notes && m.hold_record.continuation_note,
    `evidence notes preserved append-only in hold_record`) && pass;
  // Crash here (stop). New reconciler: idempotent re-read, exactly one terminal transition.
  pass = ev(E, (await r.mr.assign(id, 'schedX')) === 0, `no dispatch path can claim between crash and resolution`) && pass;
  const r1 = await r.mr.reconcileHold(id, 'succeeded', { evidence: { receipt: 'late-arrival' } });
  const r2 = await r.mr.reconcileHold(id, 'succeeded', { evidence: { receipt: 'late-arrival' } });
  pass = ev(E, r1 === true && r2 === false, `exactly one terminal transition (1 then 0 rows)`) && pass;
  pass = ev(E, r.row(id).outcome === 'SUCCEEDED', `resolved SUCCEEDED`) && pass;
  E.push('NOTE  notes the reconciler held only in memory and never merged are ' +
    'lost on crash: f01 has no separate evidence-checkpoint API; checkpointing ' +
    'is the reconciler merging via reconcileHold(\'hold\', {note}).');
  return { verdict: pass ? 'CORRECT' : 'INCORRECT', evidence: E };
}

module.exports = { scenarios: { f01, f02, f03, f04, f05, f06, f07, f08 } };
