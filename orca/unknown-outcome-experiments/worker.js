// worker.js — executes ONE logical operation through the REAL foundation stack:
// real UnifiedEventRuntime + real EffectLedger + real EffectReconciler +
// real EffectExecutor (test DB). The workerRuntime is harness-provided and
// calls the stub provider, following the module's write-ahead discipline
// (commit() as soon as the outcome is known, before dispatch returns).
// Emits lifecycle markers to the rendezvous JSONL file.
//
// argv[2]: JSON {
//   point, missionId, workOrderId, attemptId, logicalOpId, effect, input,
//   stubBase, rendezvous,
//   workerMode: 'ok'|'fail'|'throw'|'throwDefinitive'|'throwDefinitiveHard',
//   stubCfg, receiptHandoffHoldMs, preDispatchWaitMs, preAckHoldMs,
//   persistDelayMs, commitDelayMs, timeoutMs, consequence, lingerAfterUnknownMs
// }
'use strict';
const { mark, sleep, post } = require('./lib');
const api = require('./effect-api');

const cfg = JSON.parse(process.argv[2]);
const R = cfg.rendezvous;
const markerCb = (m, extra) => mark(R, m, extra);

process.on('uncaughtException', (e) => { try { mark(R, 'WORKER_ERROR', { error: String(e && e.message || e) }); } catch (_) {} process.exit(3); });

async function main() {
  if (!api.landed()) { mark(R, 'MODULE_NOT_LANDED'); process.exit(2); }
  mark(R, 'WORKER_START', { point: cfg.point, pid: process.pid });

  const effect = cfg.effect || 'a6probe:A6_PROBE';
  const opKey = api.deriveOpKey({ missionId: cfg.missionId, effect, input: cfg.input });
  mark(R, 'OP_KEY', { opKey });

  await post(cfg.stubBase, '/configure', { opKey, ...(cfg.stubCfg || {}) });

  if (cfg.preDispatchWaitMs) {
    mark(R, 'PRE_DISPATCH_WAIT');
    await sleep(cfg.preDispatchWaitMs);
    mark(R, 'PRE_DISPATCH_WAIT_DONE');
  }

  const stack = await api.makeStack({
    persistDelayMs: cfg.persistDelayMs || 0,
    markerCb,
    timeoutMs: cfg.timeoutMs || 20000,
  });
  const workerRuntime = api.makeWorkerRuntime({
    stubBase: cfg.stubBase, markerCb,
    mode: cfg.workerMode || 'ok',
    commitDelayMs: cfg.commitDelayMs || 0,
    receiptHandoffHoldMs: cfg.receiptHandoffHoldMs || 0,
    lingerAfterUnknownMs: cfg.lingerAfterUnknownMs || 0,
    postCommitHoldMs: cfg.postCommitHoldMs || 0,
  });
  stack.executor._workerRuntime = workerRuntime;

  const consequence = cfg.consequence || 'high';
  const mission = { mission_id: cfg.missionId, payload: { _effect_consequence: consequence } };
  const event = { event_type: 'A6_PROBE', payload: cfg.input };

  mark(R, 'DISPATCH_START');
  let execResult = null, execError = null;
  try {
    execResult = await stack.executor.execute({ mission, workerName: 'a6probe', event, attempt: 1 });
    mark(R, 'DISPATCH_RETURNED', { status: execResult && execResult.status });
  } catch (e) {
    execError = e;
    const isUnknown = e && e.name === 'UnknownOutcomeError';
    mark(R, isUnknown ? 'UNKNOWN_OUTCOME' : 'WORKER_ERROR', { error: String(e && e.message || e), code: e && e.code });
  }

  // Coordinator acknowledgement (harness-level, idempotent by op_key).
  // Only meaningful when execute() returned a definitive success.
  if (execResult && execResult.status === 'ok') {
    if (cfg.preAckHoldMs) {
      mark(R, 'PRE_ACK_HOLD');
      await sleep(cfg.preAckHoldMs);
    }
    await api.ackIdempotent(stack, opKey, markerCb);
  } else if (execResult && execResult.status === 'duplicate') {
    mark(R, 'DUPLICATE_SUPPRESSED', { result: 'idempotency gate held' });
    await api.ackIdempotent(stack, opKey, markerCb);
  }

  mark(R, 'WORKER_COMPLETE');
  await api.endStack(stack);
  process.exit(0);
}

main().catch(async (e) => { try { mark(R, 'WORKER_FATAL', { error: String(e && e.message || e) }); } catch (_) {} process.exit(3); });
