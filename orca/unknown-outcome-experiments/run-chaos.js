// run-chaos.js — terminal-path demonstrations + extended chaos suite.
// usage: node run-chaos.js
// Terminals:
//   T-succ  PROVEN SUCCEEDED (durable SUCCEEDED event, count 1)
//   T-fail  PROVEN FAILED (failDefinitive retryable:false -> failed_terminal;
//           retryable variant -> retry_authorized definitive_retryable_failure)
//   T-never PROVEN NEVER EXECUTED (stub proves absent -> retry eligible)
//   T-hold  STILL UNKNOWN -> HELD (probe unavailable), durable EFFECT_HELD,
//           mission parked via real MissionRuntime.hold (invisible to
//           getPending); then later proof -> RECOVERED with the result
//           (delta 4), mission resumed via resumeHeld
//   T-low   low-consequence unknown -> bounded retry_authorized;
//           high-consequence twin -> held (delta 5)
//   T-throw sync worker throw -> EFFECT_FAILED, NOT EFFECT_UNKNOWN (delta 1)
// Chaos:
//   C0   boundary: delayed commit (naive worker), kill in accept->commit
//        window -> retry_authorized; perform the retry -> count 2 (residual)
//   C1   duplicate reconciliation (same op twice concurrently)
//   C2   stale worker response arriving after UNKNOWN was recorded
//   C4   two reconcilers racing
//   C5   repeated restart (3x)
//   C6   retry storm (20 rapid reconciles; count stays 1, no dup terminals)
//   C7   mission replay with the same mission_id -> idempotency gate duplicate
//   C8   replacement coordinator resuming the same mission
//   C9   timeout -> EFFECT_UNKNOWN -> late settle lands -> reconcile recovers
//        with the result; sweep path exercised
//   C-init ledger init fire-and-forget race (delta 6)
'use strict';
const C = require('./controller');
const { sleep, post, waitMarker } = require('./lib');
const api = require('./effect-api');
const { MissionRuntime } = require('/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js');

const RESULTS = [];
function recordChaos(name, rec) {
  rec.chaos = name; rec.run_id = C.RUN_ID;
  C.record(C.CHAOS_RESULTS, rec);
  console.log(`CHAOS ${name}: ${rec.verdict} | ${rec.detail || ''}`);
  RESULTS.push(rec);
  return rec;
}

async function waitStubAccepted(opKey, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 10000)) {
    const e = await C.stubLog(opKey);
    if (e && e.accepted) return true;
    await sleep(5);
  }
  return false;
}

// Clean full worker run (no kill); returns ctx + opKey.
async function cleanRun(tag, workerCfg = {}) {
  const ctx = C.baseCtx(tag);
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({ point: tag, ...ctx, ...workerCfg });
  const done = await C.waitForMarkerOrTimeout(w.rendezvous, 'WORKER_COMPLETE', 60000);
  await new Promise((r) => w.proc.on('exit', r));
  if (!done) throw new Error(tag + ': worker did not complete');
  return { ctx, opKey, rendezvous: w.rendezvous };
}

// Kill during dispatch with the stub holding (ledger empty at death).
async function killDuringDispatch(tag) {
  const ctx = C.baseCtx(tag);
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({ point: tag, ...ctx, stubCfg: { hold_dispatch: true } });
  try {
    const kill = await C.killAt({
      proc: w.proc, rendezvous: w.rendezvous, marker: 'DISPATCH_START',
      beforeKill: async () => {
        const ok = await waitStubAccepted(opKey, 10000);
        if (!ok) throw new Error(tag + ': stub never accepted');
      },
    });
    for (const hname of ['dispatch', 'receipt', 'query']) {
      try { await post(C.STUB_BASE, '/release', { opKey, name: hname }); } catch (e) {}
    }
    return { ctx, opKey, kill };
  } finally {
    try { w.proc.kill('SIGKILL'); } catch (e) {}
  }
}

async function directStack(opts = {}) {
  const stack = await api.makeStack(opts);
  return stack;
}

// ---- Terminals ----

async function tSucc() {
  const { ctx, opKey } = await cleanRun('T-succ', { stubCfg: { receiptMode: 'separate' } });
  const restart = await C.runRestart({ ...ctx, runSweep: true });
  const st = restart.result.operation_state;
  const count = C.trueEffectCount(opKey);
  // Provider probe: the stub must confirm it executed the effect (honest SUCCEEDED).
  const q = await C.stubQuery(opKey);
  const providerProvesExecuted = q.proof !== 'none' && q.effectCount >= 1;
  const ok = restart.result.ok && st.current_state === 'SUCCEEDED'
    && restart.result.reconcile.resolution === 'recovered'
    && restart.result.reconcile.via === 'durable_succeeded_event'
    && count === 1 && restart.result.ack_present === true
    && providerProvesExecuted;
  recordChaos('T-succ', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `state=${st.current_state} via=${restart.result.reconcile.via} count=${count} ack=${restart.result.ack_present} provider_proof=${q.proof}`,
    opKey, reconcile: restart.result.reconcile, operation_state: st,
    provider_probe: { proof: q.proof, effectCount: q.effectCount, accepted: q.accepted },
  });
}

async function tFail() {
  // Non-retryable definitive failure.
  const hard = await cleanRun('T-fail-hard', { workerMode: 'throwDefinitiveHard' });
  const rHard = await C.runRestart({ ...hard.ctx, runSweep: true });
  const stHard = rHard.result.operation_state;
  // Retryable definitive failure.
  const soft = await cleanRun('T-fail-soft', { workerMode: 'throwDefinitive' });
  const rSoft = await C.runRestart({ ...soft.ctx, runSweep: true });
  // Provider probe: the provider must confirm it never executed (honest FAILED,
  // not a partial execution masquerading as a clean failure).
  const qHard = await C.stubQuery(hard.opKey);
  const qSoft = await C.stubQuery(soft.opKey);
  const ok = rHard.result.reconcile.resolution === 'failed_terminal'
    && stHard.current_state === 'FAILED'
    && rSoft.result.reconcile.resolution === 'retry_authorized'
    && rSoft.result.reconcile.reason === 'definitive_retryable_failure'
    && C.trueEffectCount(hard.opKey) === 0 && C.trueEffectCount(soft.opKey) === 0
    && qHard.proof === 'none' && qSoft.proof === 'none';
  recordChaos('T-fail', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `hard=${rHard.result.reconcile.resolution}/${stHard.current_state} soft=${rSoft.result.reconcile.resolution}/${rSoft.result.reconcile.reason} provider_proof_hard=${qHard.proof} provider_proof_soft=${qSoft.proof}`,
    hard: rHard.result.reconcile, soft: rSoft.result.reconcile,
    provider_probe_hard: { proof: qHard.proof, effectCount: qHard.effectCount },
    provider_probe_soft: { proof: qSoft.proof, effectCount: qSoft.effectCount },
  });
}

async function tNever() {
  // Point-1 style: killed before dispatch; stub proves absent.
  const ctx = C.baseCtx('T-never');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({ point: 'T-never', ...ctx, preDispatchWaitMs: 30000 });
  const m = await waitMarker(w.rendezvous, 'PRE_DISPATCH_WAIT', 30000, 5);
  await sleep(300);
  w.proc.kill('SIGKILL');
  await new Promise((r) => w.proc.on('exit', r));
  const restart = await C.runRestart({ ...ctx, runSweep: true });
  const q = await C.stubQuery(opKey);
  const ok = restart.result.reconcile.resolution === 'retry_authorized'
    && restart.result.reconcile.reason === 'probe_confirms_never_executed'
    && C.trueEffectCount(opKey) === 0 && q.proof === 'none';
  recordChaos('T-never', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `resolution=${restart.result.reconcile.resolution} reason=${restart.result.reconcile.reason} stub_proof=${q.proof} count=0`,
    reconcile: restart.result.reconcile,
    provider_probe: { proof: q.proof, effectCount: q.effectCount, accepted: q.accepted },
  });
}

async function tHold() {
  // Setup: commit lands and is durable, dispatch has not returned yet
  // (postCommitHoldMs keeps the worker inside dispatch after COMMIT_DONE),
  // then SIGKILL. Ledger row present, no SUCCEEDED event.
  const ctx = C.baseCtx('T-hold');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({ point: 'T-hold', ...ctx, postCommitHoldMs: 5000 });
  await C.killAt({ proc: w.proc, rendezvous: w.rendezvous, marker: 'COMMIT_DONE', delayMs: 500 });
  try { w.proc.kill('SIGKILL'); } catch (e) {}

  // Phase 1: reconcile with the ledger hidden -> probe fails -> HELD.
  const r1 = await C.runRestart({ ...ctx, runSweep: true, hideLedger: true });
  const heldOk = r1.result.reconcile.resolution === 'held'
    && r1.result.reconcile.reason === 'unknown_outcome_consequential_effect'
    && r1.result.operation_state.current_state === 'HELD';
  const heldEvent = (r1.result.operation_state.last_evidence || '');
  // Phase 2: mission-level hold via the real MissionRuntime.
  let missionHoldOk = false, missionResumeOk = false, pendingSeesHeld = null;
  {
    const stack = await directStack({});
    try {
      const mr = new MissionRuntime({ pool: stack.pool });
      await mr.initialize();
      await stack.pool.query(
        `INSERT INTO ping_missions (mission_id, mission_type, status, payload) VALUES ($1,'a6','running','{}')
         ON CONFLICT (mission_id) DO UPDATE SET status='running'`, [ctx.missionId]);
      const held = await mr.hold(ctx.missionId, 'a6 T-hold test');
      const heldRows = await mr.getHeld(50);
      const pending = await mr.getPending(50);
      pendingSeesHeld = pending.some((r) => r.mission_id === ctx.missionId);
      const resumed = await mr.resumeHeld(ctx.missionId);
      missionHoldOk = held === 1 && heldRows.some((r) => r.mission_id === ctx.missionId) && pendingSeesHeld === false;
      missionResumeOk = resumed === 1;
    } finally { await api.endStack(stack); }
  }
  // Phase 3: later proof -> re-probe proves execution -> RECOVERED (delta 4).
  const r2 = await C.runRestart({ ...ctx, runSweep: true });
  const st2 = r2.result.operation_state;
  const rec2 = r2.result.reconcile;
  const resultOk = rec2.resolution === 'recovered' && rec2.via === 'effector_probe:existing_terminal'
    && st2.current_state === 'RECOVERED'
    && rec2.result && rec2.result.receipt && rec2.result.committed_by === 'a6-worker';
  const ok = heldOk && missionHoldOk && missionResumeOk && resultOk;
  recordChaos('T-hold', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `held=${r1.result.reconcile.resolution} state=${r1.result.operation_state.current_state} ` +
      `missionHold=${missionHoldOk} pendingSeesHeld=${pendingSeesHeld} resumed=${missionResumeOk} ` +
      `later=${rec2.resolution}/${rec2.via} state2=${st2.current_state} resultCarried=${!!(rec2.result && rec2.result.receipt)}`,
    phase1: r1.result.reconcile, phase3: rec2,
  });
}

async function tLow() {
  // Low-consequence op: timeout -> UNKNOWN -> reconcile with probe
  // unavailable -> bounded risk-accepted retry (delta 5).
  // High-consequence twin -> held.
  async function one(tag, consequence) {
    const ctx = C.baseCtx(tag);
    const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
    const w = C.runWorker({ point: tag, ...ctx, stubCfg: { hold_dispatch: true }, timeoutMs: 2000, consequence });
    const done = await C.waitForMarkerOrTimeout(w.rendezvous, 'UNKNOWN_OUTCOME', 30000);
    await new Promise((r) => w.proc.on('exit', r));
    if (!done) throw new Error(tag + ': no UNKNOWN_OUTCOME');
    for (const hname of ['dispatch', 'receipt', 'query']) {
      try { await post(C.STUB_BASE, '/release', { opKey, name: hname }); } catch (e) {}
    }
    const restart = await C.runRestart({ ...ctx, runSweep: true, noPool: true, reconcileOpts: { consequence } });
    return { ctx, opKey, restart };
  }
  const low = await one('T-low', 'low');
  const high = await one('T-low-high', 'high');
  const rl = low.restart.result.reconcile, rh = high.restart.result.reconcile;
  const ok = rl.resolution === 'retry_authorized' && rl.reason === 'unknown_outcome_low_consequence_risk_accepted'
    && rh.resolution === 'held' && rh.reason === 'unknown_outcome_consequential_effect';
  recordChaos('T-low', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `low=${rl.resolution}/${rl.reason} high=${rh.resolution}/${rh.reason}`,
    low: rl, high: rh,
  });
}

async function tThrow() {
  // Delta 1: a synchronous worker throw is EFFECT_FAILED, NOT EFFECT_UNKNOWN.
  const { ctx, opKey } = await cleanRun('T-throw', { workerMode: 'throw' });
  const stack = await directStack({});
  let types, state;
  try {
    const hist = await api.eventHistory(stack, opKey);
    types = hist.map((e) => e.event_type);
    state = await api.operationState(stack, opKey);
  } finally { await api.endStack(stack); }
  const ok = types.includes('EFFECT_FAILED') && !types.includes('EFFECT_UNKNOWN');
  recordChaos('T-throw', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `event_types=${types.join(',')} state=${state.current_state}`,
    event_types: types,
  });
}

// ---- Chaos ----

async function c0() {
  // Boundary: naive worker (commit delayed 2s), SIGKILL inside the
  // accept->commit window -> probe false -> retry_authorized. Then PERFORM
  // the retry through the real executor: the idempotency gate sees no row
  // and dispatches again -> stub accepts again -> count 2. This names the
  // residual window; it is a finding, not a module bug.
  const ctx = C.baseCtx('C0');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({ point: 'C0', ...ctx, stubCfg: { receiptMode: 'separate' }, commitDelayMs: 2000 });
  const kill = await C.killAt({ proc: w.proc, rendezvous: w.rendezvous, marker: 'COMMIT_START', delayMs: 500 });
  try { w.proc.kill('SIGKILL'); } catch (e) {}
  const r1 = await C.runRestart({ ...ctx, runSweep: false });
  const d1 = r1.result.reconcile;
  let retryCount = null, retryStatus = null;
  if (d1.resolution === 'retry_authorized') {
    const stack = await directStack({});
    try {
      const workerRuntime = api.makeWorkerRuntime({ stubBase: C.STUB_BASE, markerCb: () => {}, mode: 'ok' });
      stack.executor._workerRuntime = workerRuntime;
      await post(C.STUB_BASE, '/configure', { opKey });
      const mission = { mission_id: ctx.missionId, payload: { _effect_consequence: 'high' } };
      const out = await stack.executor.execute({ mission, workerName: 'a6probe', event: { event_type: 'A6_PROBE', payload: ctx.input }, attempt: d1.nextAttempt });
      retryStatus = out.status;
    } finally { await api.endStack(stack); }
    retryCount = C.trueEffectCount(opKey);
  }
  const ok = d1.resolution === 'retry_authorized' && d1.reason === 'probe_confirms_never_executed'
    && retryStatus === 'ok' && retryCount === 2;
  recordChaos('C0', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `reconcile=${d1.resolution}/${d1.reason} retry_status=${retryStatus} true_effect_count=${retryCount} (residual accept->commit window demonstrated)`,
    reconcile: d1, kill_evidence: kill,
  });
}

async function c1() {
  // Concurrent duplicate reconciliation of a recovered op.
  const { ctx, opKey } = await cleanRun('C1', { stubCfg: { receiptMode: 'separate' } });
  const rr = await C.runRestart({ ...ctx, runSweep: false });
  if (rr.result.reconcile.resolution !== 'recovered') throw new Error('C1 setup did not recover');
  const s1 = C.spawnRestart({ ...ctx, runSweep: false });
  const s2 = C.spawnRestart({ ...ctx, runSweep: false });
  const [c1r, c2r] = await Promise.all([s1.completion, s2.completion]);
  await Promise.all([s1.done, s2.done]);
  const stack = await directStack({});
  let recCount;
  try {
    const hist = await api.eventHistory(stack, opKey);
    recCount = hist.filter((e) => e.event_type === 'EFFECT_RECONCILED').length;
  } finally { await api.endStack(stack); }
  const vias = [c1r.result.reconcile.via, c2r.result.reconcile.via].sort().join('|');
  const ok = recCount === 1 && C.trueEffectCount(opKey) === 1
    && c1r.result.reconcile.resolution === 'recovered' && c2r.result.reconcile.resolution === 'recovered';
  recordChaos('C1', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `reconciled_events=${recCount} vias=${vias} count=${C.trueEffectCount(opKey)}`,
  });
}

async function c2() {
  // Stale worker response after UNKNOWN was recorded: timeout first, then
  // the (lingering) worker's late dispatch resolves -> late settle records
  // the row and emits SUCCEEDED; a later reconcile absorbs it, no duplicate.
  const ctx = C.baseCtx('C2');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({
    point: 'C2', ...ctx, stubCfg: { hold_dispatch: true }, timeoutMs: 2000, lingerAfterUnknownMs: 8000,
  });
  const unk = await C.waitForMarkerOrTimeout(w.rendezvous, 'UNKNOWN_OUTCOME', 30000);
  if (!unk) throw new Error('C2: no UNKNOWN_OUTCOME');
  // Reconcile BEFORE the late response arrives.
  const rMid = await C.runRestart({ ...ctx, runSweep: false });
  // Now let the stale response through: the lingering worker settles late.
  await post(C.STUB_BASE, '/release', { opKey, name: 'dispatch' });
  await new Promise((r) => w.proc.on('exit', r));
  await sleep(1500); // late-settle handlers run
  const rLate = await C.runRestart({ ...ctx, runSweep: true });
  const st = rLate.result.operation_state;
  const ok = rMid.result.reconcile.resolution === 'retry_authorized'
    && st.current_state === 'SUCCEEDED'
    && rLate.result.reconcile.resolution === 'recovered'
    && rLate.result.reconcile.via === 'durable_succeeded_event'
    && C.trueEffectCount(opKey) === 1;
  recordChaos('C2', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `mid=${rMid.result.reconcile.resolution} late_state=${st.current_state} late_via=${rLate.result.reconcile.via} count=${C.trueEffectCount(opKey)}`,
    mid: rMid.result.reconcile, late: rLate.result.reconcile,
  });
}

async function c4() {
  // Two reconcilers racing on an unreconciled op.
  const { ctx, opKey } = await killDuringDispatch('C4');
  const s1 = C.spawnRestart({ ...ctx, runSweep: false });
  const s2 = C.spawnRestart({ ...ctx, runSweep: false });
  const [c1r, c2r] = await Promise.all([s1.completion, s2.completion]);
  await Promise.all([s1.done, s2.done]);
  const rs = [c1r.result.reconcile.resolution, c2r.result.reconcile.resolution].sort();
  const ok = rs[0] === 'deferred_to_existing_terminal' || rs[1] === 'deferred_to_existing_terminal'
    || (rs[0] === 'retry_authorized' && rs[1] === 'retry_authorized');
  recordChaos('C4', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `resolutions=${rs.join(',')} (retry_authorized emits no terminal; defer or double-retry-auth both safe)`,
    r1: c1r.result.reconcile, r2: c2r.result.reconcile,
  });
}

async function c5() {
  const { ctx, opKey } = await killDuringDispatch('C5');
  const states = [];
  for (let i = 0; i < 3; i++) {
    const r = await C.runRestart({ ...ctx, runSweep: true });
    states.push(r.result.reconcile.resolution + '/' + (r.result.reconcile.reason || r.result.reconcile.via || ''));
  }
  const stack = await directStack({});
  let terminals;
  try {
    const hist = await api.eventHistory(stack, opKey);
    terminals = hist.filter((e) => ['EFFECT_SUCCEEDED', 'EFFECT_FAILED', 'EFFECT_RECONCILED', 'EFFECT_HELD'].includes(e.event_type)).length;
  } finally { await api.endStack(stack); }
  const ok = states.every((s) => s.startsWith('retry_authorized')) && terminals === 0 && C.trueEffectCount(opKey) === 1;
  recordChaos('C5', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `3x restarts: ${states.join(' ; ')} terminal_events=${terminals} count=${C.trueEffectCount(opKey)}`,
  });
}

async function c6() {
  const { ctx, opKey } = await cleanRun('C6', { stubCfg: { receiptMode: 'separate' } });
  await C.runRestart({ ...ctx, runSweep: false });
  const stack = await directStack({});
  const resolutions = new Set();
  try {
    for (let i = 0; i < 20; i++) {
      const d = await stack.reconciler.reconcile(opKey, { consequence: 'high', maxAttempts: 3 });
      resolutions.add(d.resolution + ':' + (d.via || d.reason || ''));
    }
    const hist = await api.eventHistory(stack, opKey);
    const succ = hist.filter((e) => e.event_type === 'EFFECT_SUCCEEDED').length;
    const rec = hist.filter((e) => e.event_type === 'EFFECT_RECONCILED').length;
    const ok = succ === 1 && rec === 0 && C.trueEffectCount(opKey) === 1;
    recordChaos('C6', {
      verdict: ok ? 'PASS' : 'FAIL',
      detail: `20 rapid reconciles: resolutions={${[...resolutions].join(',')}} succeeded_events=${succ} reconciled_events=${rec} count=${C.trueEffectCount(opKey)}`,
    });
  } finally { await api.endStack(stack); }
}

async function c7() {
  // Mission replay with the same mission_id: the executor's idempotency gate
  // returns {status:'duplicate'} without touching the provider.
  const { ctx, opKey } = await cleanRun('C7', { stubCfg: { receiptMode: 'separate' } });
  const stack = await directStack({});
  let out;
  try {
    const workerRuntime = api.makeWorkerRuntime({ stubBase: C.STUB_BASE, markerCb: () => {}, mode: 'ok' });
    stack.executor._workerRuntime = workerRuntime;
    const mission = { mission_id: ctx.missionId, payload: {} };
    out = await stack.executor.execute({ mission, workerName: 'a6probe', event: { event_type: 'A6_PROBE', payload: ctx.input }, attempt: 1 });
  } finally { await api.endStack(stack); }
  const ok = out.status === 'duplicate' && C.trueEffectCount(opKey) === 1;
  recordChaos('C7', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `replay status=${out.status} count=${C.trueEffectCount(opKey)}`,
  });
}

async function c8() {
  // Replacement coordinator resumes the same mission: reconcile, then the
  // new attempt runs through the idempotency gate.
  const { ctx, opKey } = await killDuringDispatch('C8');
  const r1 = await C.runRestart({ ...ctx, runSweep: false });
  const d = r1.result.reconcile;
  let out = null;
  if (d.resolution === 'retry_authorized') {
    const stack = await directStack({});
    try {
      const workerRuntime = api.makeWorkerRuntime({ stubBase: C.STUB_BASE, markerCb: () => {}, mode: 'ok' });
      stack.executor._workerRuntime = workerRuntime;
      await post(C.STUB_BASE, '/configure', { opKey });
      const mission = { mission_id: ctx.missionId, payload: { _effect_consequence: 'high' } };
      out = await stack.executor.execute({ mission, workerName: 'a6probe', event: { event_type: 'A6_PROBE', payload: ctx.input }, attempt: d.nextAttempt });
    } finally { await api.endStack(stack); }
  }
  // NOTE: C8's retry re-dispatches because the probe found no row while the
  // stub had accepted: this is the same residual window as C0, reported.
  const count = C.trueEffectCount(opKey);
  recordChaos('C8', {
    verdict: d.resolution === 'retry_authorized' && out && out.status === 'ok' && count === 2 ? 'PASS' : 'FAIL',
    detail: `reconcile=${d.resolution} replacement attempt status=${out && out.status} count=${count} (documents the residual window, same as C0)`,
    reconcile: d,
  });
}

async function c9() {
  // Timeout -> EFFECT_UNKNOWN, late settle lands, restart recovers with the
  // result; the scheduler sweep path (sweepUnknown) is exercised.
  const ctx = C.baseCtx('C9');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({
    point: 'C9', ...ctx, stubCfg: { hold_dispatch: true }, timeoutMs: 2000, lingerAfterUnknownMs: 10000,
  });
  const unk = await C.waitForMarkerOrTimeout(w.rendezvous, 'UNKNOWN_OUTCOME', 30000);
  if (!unk) throw new Error('C9: no UNKNOWN_OUTCOME');
  await post(C.STUB_BASE, '/release', { opKey, name: 'dispatch' });
  await new Promise((r) => w.proc.on('exit', r));
  await sleep(1500);
  const restart = await C.runRestart({ ...ctx, runSweep: true });
  const st = restart.result.operation_state;
  const sw = restart.result.sweep;
  const ok = st.current_state === 'SUCCEEDED'
    && restart.result.reconcile.resolution === 'recovered'
    && restart.result.reconcile.via === 'durable_succeeded_event'
    && restart.result.reconcile.result && restart.result.reconcile.result.receipt
    && C.trueEffectCount(opKey) === 1;
  recordChaos('C9', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: `state=${st.current_state} via=${restart.result.reconcile.via} result_carried=${!!(restart.result.reconcile.result && restart.result.reconcile.result.receipt)} sweep_swept=${sw && sw.swept} count=${C.trueEffectCount(opKey)}`,
    reconcile: restart.result.reconcile,
  });
}

async function cInit() {
  // Delta 6: the scheduler's ledger init is fire-and-forget. Characterize:
  // build the stack WITHOUT awaiting ledger.initialize, dispatch at once.
  const ctx = C.baseCtx('C-init');
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  await post(C.STUB_BASE, '/configure', { opKey });
  const env = require('./db').applyEnv();
  const { Pool } = require('/home/nolan/ping/gateway/node_modules/pg');
  const pool = new Pool({
    host: env.POSTGRES_HOST, port: parseInt(env.POSTGRES_PORT, 10),
    database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD,
  });
  const REAL = api.REAL;
  const UER = api.UER;
  const eventRuntime = new UER.UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const ledger = new REAL.EffectLedger({ pool });
  // Fire-and-forget, exactly like MissionScheduler.start().
  ledger.initialize().catch(() => {});
  const reconciler = new REAL.EffectReconciler({ pool, eventRuntime, ledger });
  const executor = new REAL.EffectExecutor({ pool, eventRuntime, ledger, reconciler, workerRuntime: null, timeoutMs: 20000 });
  const workerRuntime = api.makeWorkerRuntime({ stubBase: C.STUB_BASE, markerCb: () => {}, mode: 'ok' });
  executor._workerRuntime = workerRuntime;
  const mission = { mission_id: ctx.missionId, payload: {} };
  let outcome = null, error = null;
  try {
    outcome = await executor.execute({ mission, workerName: 'a6probe', event: { event_type: 'A6_PROBE', payload: ctx.input }, attempt: 1 });
  } catch (e) { error = String(e && e.message || e); }
  await sleep(500);
  // After init settles, the DISPATCHED record must exist if dispatch ran.
  const hist = await reconciler.queryOp(opKey);
  const types = hist.map((e) => e.event_type);
  await pool.end().catch(() => {});
  const dispatchedSurvived = types.includes('EFFECT_DISPATCHED');
  const ok = outcome && outcome.status === 'ok' ? dispatchedSurvived
    : (!outcome && /relation "ping_effect_ledger" does not exist/.test(error || '') ? true : false);
  recordChaos('C-init', {
    verdict: ok ? 'PASS' : 'FAIL',
    detail: error
      ? `dispatch threw before DISPATCHED (init race bit): ${error.slice(0, 120)}`
      : `dispatch won the race: status=${outcome && outcome.status} DISPATCHED durable=${dispatchedSurvived}`,
    event_types: types,
  });
}

async function main() {
  await C.startStub();
  try {
    console.log('== terminal demonstrations ==');
    await tSucc();
    await tFail();
    await tNever();
    await tHold();
    await tLow();
    await tThrow();
    console.log('== chaos suite ==');
    await c0();
    await c1();
    await c2();
    await c4();
    await c5();
    await c6();
    await c7();
    await c8();
    await c9();
    await cInit();
  } finally {
    C.stopStub();
  }
  const fails = RESULTS.filter((r) => r.verdict === 'FAIL');
  console.log(`chaos complete: ${RESULTS.length - fails.length}/${RESULTS.length} PASS; results in ${C.CHAOS_RESULTS}`);
  if (fails.length) console.log('FAILURES:', fails.map((f) => f.chaos).join(', '));
}

main().catch((e) => { console.error('CHAOS FATAL', e); process.exit(1); });
