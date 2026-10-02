// reconcile-restart.js — FRESH process, same idempotency key.
// Real stack on the test DB. Runs EffectReconciler.reconcile + the scheduler
// sweep path (sweepUnknown), then ensures the coordinator ack idempotently.
// The consequence is derived from the DISPATCHED event payload (mirroring
// the module's _consequenceFrom) unless explicitly overridden; this exercises
// the low-vs-high consequence branch (delta 5).
// argv[2]: JSON {missionId, workOrderId, attemptId, logicalOpId, effect, input,
//                stubBase, rendezvous, stubCfg, reconcileOpts, runSweep,
//                probeDelayMs, hideLedger (rename ping_effect_ledger so the
//                probe fails -> exercised 'held' path), noPool (degraded:
//                reconcile with no persistence -> HOLD path)}
// stdout: single JSON line with reconcile + sweep + operation state.
'use strict';
const { mark, post, sleep } = require('./lib');
const api = require('./effect-api');

const cfg = JSON.parse(process.argv[2]);
const R = cfg.rendezvous;
const markerCb = (m, extra) => mark(R, m, extra);

function consequenceFrom(history) {
  for (const e of history) {
    const p = e && e.payload ? (typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload) : {};
    if (p && p.consequence) return p.consequence;
  }
  return 'high';
}

async function main() {
  if (!api.landed()) { mark(R, 'MODULE_NOT_LANDED'); process.exit(2); }
  mark(R, 'RESTART_START', { pid: process.pid });
  const effect = cfg.effect || 'a6probe:A6_PROBE';
  const opKey = api.deriveOpKey({ missionId: cfg.missionId, effect, input: cfg.input });

  if (cfg.stubCfg) await post(cfg.stubBase, '/configure', { opKey, ...cfg.stubCfg });

  let stack;
  if (cfg.noPool) {
    // Degraded reconciler: no persistence to consult -> probe 'unknown' -> HOLD.
    const ledger = new api.REAL.EffectLedger({ pool: null });
    const reconciler = new api.REAL.EffectReconciler({ pool: null, eventRuntime: null, ledger });
    stack = { pool: null, eventRuntime: null, ledger, reconciler, executor: null, REAL: api.REAL };
    mark(R, 'DEGRADED_NO_POOL');
  } else {
    stack = await api.makeStack({ markerCb, probeDelayMs: cfg.probeDelayMs || 0 });
  }

  if (cfg.hideLedger && stack.pool) {
    await stack.pool.query('ALTER TABLE ping_effect_ledger RENAME TO a6_ledger_hidden');
    mark(R, 'LEDGER_HIDDEN');
  }

  // Derive consequence from the durable DISPATCHED record (module behavior),
  // unless the caller overrides (e.g. chaos C-low for the low branch).
  let consequence = (cfg.reconcileOpts && cfg.reconcileOpts.consequence) || null;
  if (!consequence && !cfg.noPool) {
    try {
      const hist = await api.eventHistory(stack, opKey);
      consequence = consequenceFrom(hist);
      mark(R, 'CONSEQUENCE_DERIVED', { consequence });
    } catch (e) { consequence = 'high'; }
  }
  consequence = consequence || 'high';

  mark(R, 'RECONCILE_START', { consequence });
  let decision;
  try {
    decision = await api.reconcileOnce(stack, opKey, { consequence, maxAttempts: 3, ...(cfg.reconcileOpts || {}) });
  } catch (e) {
    mark(R, 'RECONCILE_ERROR', { error: String(e && e.message || e) });
    throw e;
  }
  mark(R, 'RECONCILE_DONE', { resolution: decision && decision.resolution, via: decision && decision.via });

  let sweep = null;
  if (cfg.runSweep && !cfg.noPool) {
    mark(R, 'SWEEP_START');
    const acted = [];
    sweep = await api.sweepOnce(stack, {
      act: async (resolution, sweptOpKey, context) => { acted.push({ opKey: sweptOpKey, resolution: resolution && resolution.resolution }); },
    });
    sweep.acted = acted;
    mark(R, 'SWEEP_DONE', { swept: sweep.swept });
  }

  // Idempotent coordinator ack: present iff the outcome is decided-successful.
  let state = null, ack = false, ledgerRow = null, recoveredResult = null;
  if (!cfg.noPool) {
    if (cfg.hideLedger && stack.pool) {
      await stack.pool.query('ALTER TABLE a6_ledger_hidden RENAME TO ping_effect_ledger');
      mark(R, 'LEDGER_RESTORED');
    }
    state = await api.operationState(stack, opKey);
    ledgerRow = await api.ledgerRow(stack, opKey);
    if (decision && decision.resolution === 'recovered' && decision.result !== undefined) {
      recoveredResult = decision.result;
    }
    if (state.current_state === 'SUCCEEDED' || state.current_state === 'RECOVERED') {
      await api.ackIdempotent(stack, opKey, markerCb);
    }
    ack = await api.ackPresent(stack, opKey);
    await api.endStack(stack);
  }

  mark(R, 'RESTART_COMPLETE');
  console.log(JSON.stringify({
    ok: true, opKey, consequence,
    reconcile: safe(decision),
    sweep: safe(sweep),
    operation_state: safe(state),
    ledger_row: ledgerRow ? { op_key: ledgerRow.op_key, effect: ledgerRow.effect, has_result: ledgerRow.result != null, consequence: ledgerRow.consequence } : null,
    recovered_result: safe(recoveredResult),
    ack_present: ack,
  }));
  process.exit(0);
}

function safe(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return String(v); } }

main().catch((e) => { try { mark(R, 'RESTART_FATAL', { error: String(e && e.message || e) }); } catch (_) {} process.exit(1); });
