// run-matrix.js — executes the 12-point kill matrix, one JSONL record per point.
// usage: node run-matrix.js
// Points 1-10 go through controller.killPoint (worker SIGKILL at the target
// marker, then a fresh-process restart running reconcile + sweepUnknown).
// Points 11-12 use spawnRestart so the restart itself can be SIGKILLed mid-run.
'use strict';
const C = require('./controller');
const { sleep, post, waitMarker } = require('./lib');
const api = require('./effect-api');

async function waitStubAccepted(opKey, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 10000)) {
    const e = await C.stubLog(opKey);
    if (e && e.accepted) return true;
    await sleep(5);
  }
  return false;
}

const SEP = { receiptMode: 'separate' };

const POINTS = {
  1: {
    workerCfg: { preDispatchWaitMs: 30000 },
    killMarker: 'PRE_DISPATCH_WAIT', delayMs: 300,
    expectation: 'no DISPATCHED record, effect count 0, retry eligible (never dispatched)',
  },
  2: {
    workerCfg: { stubCfg: { hold_dispatch: true } },
    killMarker: 'DISPATCH_START', delayMs: 0,
    beforeKill: async (w, opKey) => {
      const ok = await waitStubAccepted(opKey, 10000);
      if (!ok) throw new Error('p2: stub never accepted before kill');
    },
    expectation: 'dispatch in flight, stub accepted, commit never ran; probe false -> retry_authorized; stub divergence recorded',
  },
  3: {
    workerCfg: { stubCfg: { ...SEP, receiptDelayMs: 1500 } },
    killMarker: 'DISPATCH_RETURNED', delayMs: 100,
    expectation: 'dispatch returned, receipt not yet processed; commit landed -> recovered via effector_probe',
  },
  4: {
    workerCfg: { stubCfg: { ...SEP, hold_receipt: true } },
    killMarker: 'RECEIPT_REQUEST', delayMs: 200,
    beforeKill: async (w, opKey) => {
      const ok = await waitStubAccepted(opKey, 10000);
      if (!ok) throw new Error('p4: stub never accepted before kill');
    },
    expectation: 'provider accepted; worker dead before receipt; commit-on-accept landed -> recovered',
  },
  5: {
    workerCfg: { stubCfg: { ...SEP }, receiptHandoffHoldMs: 4000 },
    killMarker: 'RECEIPT_BYTES', delayMs: 200,
    expectation: 'accepted, receipt in flight (worker memory); commit landed -> recovered',
  },
  6: {
    workerCfg: { stubCfg: { ...SEP }, receiptHandoffHoldMs: 4000 },
    killMarker: 'RECEIPT_BYTES', delayMs: 2500,
    expectation: 'receipt in worker memory, handoff held; commit landed -> recovered',
  },
  7: {
    workerCfg: { stubCfg: { ...SEP } },
    killMarker: 'PERSIST_START', killOccurrence: 1, delayMs: 0,
    expectation: 'kill during the commit INSERT (natural race); row almost surely committed -> recovered; a miss -> retry_authorized (residual window)',
  },
  8: {
    workerCfg: { stubCfg: { ...SEP } },
    killMarker: 'PERSIST_DONE', killOccurrence: 2, delayMs: 50,
    expectation: 'executor write-ahead done; SUCCEEDED may or may not have emitted -> recovered; effect count exactly 1',
  },
  9: {
    workerCfg: { stubCfg: { ...SEP }, preAckHoldMs: 4000 },
    killMarker: 'PERSIST_DONE', killOccurrence: 2, delayMs: 500,
    expectation: 'outcome durable, ack missing; restart recovers and completes the idempotent ack',
  },
  10: {
    workerCfg: { stubCfg: { ...SEP } },
    noKill: true,
    expectation: 'fully complete; kill is a semantic no-op; final result stable',
  },
};

// Points 11 and 12: build an UNKNOWN, then SIGKILL the restart mid-run.
async function buildUnknownSigkill(tag) {
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

// Point 12 setup: a real timeout leaves a durable EFFECT_UNKNOWN (delta 1:
// only timeout/lost-ack is UNKNOWN). The worker exits on its own.
async function buildUnknownTimeout(tag) {
  const ctx = C.baseCtx(tag);
  const opKey = api.deriveOpKey({ missionId: ctx.missionId, effect: ctx.effect, input: ctx.input });
  const w = C.runWorker({
    point: tag, ...ctx, stubCfg: { hold_dispatch: true }, timeoutMs: 2000,
  });
  const done = await C.waitForMarkerOrTimeout(w.rendezvous, 'UNKNOWN_OUTCOME', 30000);
  if (!done) throw new Error(tag + ': worker never hit UNKNOWN_OUTCOME');
  await new Promise((r) => w.proc.on('exit', r));
  for (const hname of ['dispatch', 'receipt', 'query']) {
    try { await post(C.STUB_BASE, '/release', { opKey, name: hname }); } catch (e) {}
  }
  return { ctx, opKey };
}

async function recordPoint(n, fields) {
  const rec = { kill_point: n, run_id: C.RUN_ID, ...fields };
  rec.final_result = C.summarize(rec);
  C.record(C.RESULTS, rec);
  console.log(`POINT ${n}: ${rec.final_result} | true_effect_count=${rec.effect_evidence.true_effect_count}`);
  return rec;
}

async function runPoint11() {
  const { ctx, opKey, kill } = await buildUnknownSigkill('p11setup');
  // Restart 1: reconcile with the ledger probe delayed -> SIGKILL mid-probe.
  const r1 = C.spawnRestart({ ...ctx, runSweep: false, probeDelayMs: 3000 });
  const kill2 = await C.killAt({ proc: r1.proc, rendezvous: r1.rendezvous, marker: 'RECONCILE_START', delayMs: 500 });
  await r1.done;
  // Restart 2: clean re-run; must converge idempotently.
  const restart = await C.runRestart({ ...ctx, runSweep: true });
  return recordPoint(11, {
    mission_id: ctx.missionId, work_order_id: ctx.workOrderId,
    attempt_id: ctx.attemptId, logical_operation_id: ctx.logicalOpId,
    idempotency_key: opKey,
    dispatch_state: await C.stubLog(opKey),
    effect_evidence: { stub_query: await C.stubQuery(opKey), effect_count: await C.stubEffectCount(opKey), true_effect_count: C.trueEffectCount(opKey) },
    durable_evidence: await C.ledgerEvidence(opKey),
    reconciliation_state: restart.result,
    retry_eligibility: restart.result && restart.result.reconcile,
    kill_evidence: { setup_kill: kill, restart_kill: kill2 },
    note: 'restart 1 SIGKILLed mid-probe (PROBE_START seen); restart 2 must converge idempotently',
    expectation: 'reconciler killed mid-probe; restart re-runs reconcile idempotently',
  });
}

async function runPoint12() {
  const { ctx, opKey } = await buildUnknownTimeout('p12setup');
  // Restart 1: reconcile + sweep with the probe delayed -> SIGKILL mid-run.
  const r1 = C.spawnRestart({ ...ctx, runSweep: true, probeDelayMs: 3000 });
  const kill = await C.killAt({ proc: r1.proc, rendezvous: r1.rendezvous, marker: 'SWEEP_START', delayMs: 500 });
  await r1.done;
  // Restart 2: clean; the sweep must resume and settle the op.
  const restart = await C.runRestart({ ...ctx, runSweep: true });
  return recordPoint(12, {
    mission_id: ctx.missionId, work_order_id: ctx.workOrderId,
    attempt_id: ctx.attemptId, logical_operation_id: ctx.logicalOpId,
    idempotency_key: opKey,
    dispatch_state: await C.stubLog(opKey),
    effect_evidence: { stub_query: await C.stubQuery(opKey), effect_count: await C.stubEffectCount(opKey), true_effect_count: C.trueEffectCount(opKey) },
    durable_evidence: await C.ledgerEvidence(opKey),
    reconciliation_state: restart.result,
    retry_eligibility: restart.result && restart.result.reconcile,
    kill_evidence: { restart_kill: kill },
    note: 'sweep process SIGKILLed mid-run; next restart resumes cleanly',
    expectation: 'kill the sweep mid-run; next restart resumes cleanly',
  });
}

async function main() {
  await C.startStub();
  try {
    for (let n = 1; n <= 10; n++) {
      const def = POINTS[n];
      console.log(`--- POINT ${n}: ${def.expectation}`);
      await C.killPoint(n, def);
    }
    console.log('--- POINT 11');
    await runPoint11();
    console.log('--- POINT 12');
    await runPoint12();
  } finally {
    C.stopStub();
  }
  console.log('matrix complete; results in', C.RESULTS);
}

main().catch((e) => { console.error('MATRIX FATAL', e); process.exit(1); });
