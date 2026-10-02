// effect-api.js — adapter over the REAL branch module.
// Real: UnifiedEventRuntime, EffectLedger, EffectReconciler, EffectExecutor
// from /home/nolan/ping/ping-runtime/orchestration/effect_reconciler.js
// (branch feat/orca-unknown-outcome-port @ 36d401538).
//
// Branch semantics (verified against the module, NOT the pinned contract):
//  - deriveOpKey({missionId, effect, input})  (not `effectName`)
//  - effect string = workerName + ':' + event.event_type  -> 'a6probe:A6_PROBE'
//  - consequence from mission.payload._effect_consequence ('high' default)
//  - sync worker throw -> EFFECT_FAILED + rethrow (NOT unknown); only
//    timeout/lost-ack -> EFFECT_UNKNOWN + UnknownOutcomeError
//  - failDefinitive(error, {retryable}) annotates definitive failures
//  - probe() consults ONLY the local ledger (no provider query)
//  - EFFECT_RECONCILED carries `result` (probe-recovered results survive restarts)
//  - held + later proof -> can still RECOVER (hold does not block new evidence)
//  - unknown + low consequence + attempts left -> bounded retry; high -> held
'use strict';
const fs = require('fs');
const { Pool } = require('/home/nolan/ping/gateway/node_modules/pg');
const { applyEnv } = require('./db');
const { sleep } = require('./lib');

const REAL = require('/home/nolan/ping/ping-runtime/orchestration/effect_reconciler.js');
const UER_PATH = '/home/nolan/ping/ping-runtime/events/unified_event_runtime.js';
const UER = require(UER_PATH);

function landed() {
  return !!(REAL && REAL.EffectLedger && REAL.EffectReconciler && REAL.EffectExecutor
    && REAL.deriveOpKey && REAL.canonicalJson && REAL.UnknownOutcomeError && UER);
}

// pg.Pool pointed at the TEST database only, with an optional query wrapper:
// any INSERT into ping_effect_ledger emits PERSIST_START / PERSIST_DONE via
// markerCb and can be delayed (persistDelayMs) to widen the point-7 window.
// Any SELECT from ping_effect_ledger can be delayed (probeDelayMs) to widen
// the point-11 mid-probe window. Test infrastructure only; module untouched.
function makePool({ persistDelayMs = 0, probeDelayMs = 0, markerCb = null } = {}) {
  const env = applyEnv();
  const pool = new Pool({
    host: env.POSTGRES_HOST, port: parseInt(env.POSTGRES_PORT, 10),
    database: env.POSTGRES_DB, user: env.POSTGRES_USER, password: env.POSTGRES_PASSWORD,
    max: 4, idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000,
  });
  const origQuery = pool.query.bind(pool);
  pool.query = async function (text, params) {
    const t = typeof text === 'string' ? text : '';
    const isLedgerWrite = /insert\s+into\s+ping_effect_ledger/i.test(t);
    const isLedgerProbe = /^\s*select/i.test(t) && /from\s+ping_effect_ledger/i.test(t);
    if (markerCb && isLedgerProbe && probeDelayMs > 0) markerCb('PROBE_START');
    if (isLedgerProbe && probeDelayMs > 0) await sleep(probeDelayMs);
    if (markerCb && isLedgerWrite) markerCb('PERSIST_START');
    if (isLedgerWrite && persistDelayMs > 0) await sleep(persistDelayMs);
    try {
      const res = await origQuery(text, params);
      if (markerCb && isLedgerWrite) markerCb('PERSIST_DONE');
      if (markerCb && isLedgerProbe) markerCb('PROBE_DONE');
      return res;
    } catch (e) {
      if (markerCb && isLedgerWrite) markerCb('PERSIST_ERROR');
      throw e;
    }
  };
  return pool;
}

// The REAL stack: real UnifiedEventRuntime + real EffectLedger +
// real EffectReconciler + real EffectExecutor, all on the test DB.
// Ledger init is AWAITED here (the scheduler's fire-and-forget init is a
// documented deviation, characterized separately in chaos C-init).
async function makeStack({ persistDelayMs = 0, probeDelayMs = 0, markerCb = null, timeoutMs = 20000 } = {}) {
  const pool = makePool({ persistDelayMs, probeDelayMs, markerCb });
  const eventRuntime = new UER.UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const ledger = new REAL.EffectLedger({ pool });
  await ledger.initialize();
  await pool.query(`CREATE TABLE IF NOT EXISTS a6_ack (
    op_key TEXT PRIMARY KEY, acked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const reconciler = new REAL.EffectReconciler({ pool, eventRuntime, ledger });
  const executor = new REAL.EffectExecutor({ pool, eventRuntime, ledger, reconciler, workerRuntime: null, timeoutMs });
  return { pool, eventRuntime, ledger, reconciler, executor, REAL, UER };
}

function endStack(stack) {
  if (stack && stack.pool) return stack.pool.end().catch(() => {});
}

function deriveOpKey({ missionId, effect, input }) {
  return REAL.deriveOpKey({ missionId, effect, input });
}

// Fake workerRuntime: the "worker" that calls the stub provider, then follows
// the module's write-ahead discipline: commit() as soon as the outcome is
// known (on provider accept), BEFORE returning from dispatch. The executor's
// own write-ahead record after dispatch returns is the second layer.
// mode: 'ok' | 'fail' | 'throw' | 'throwDefinitive' | 'throwDefinitiveHard'.
//   'fail' / 'throw' -> definitive failure (EFFECT_FAILED, NOT unknown).
//   'throwDefinitive' -> failDefinitive({retryable:true}) then throw.
//   'throwDefinitiveHard' -> failDefinitive({retryable:false}) then throw.
// commitDelayMs widens the accept->commit window (C0 characterization only).
// receiptHandoffHoldMs holds the receipt in worker memory (point 5/6).
// lingerAfterUnknownMs keeps the process alive after a timeout so the late
// settle can land (C9 timeout characterization).
const { post } = require('./lib');
function makeWorkerRuntime({ stubBase, markerCb, mode = 'ok', commitDelayMs = 0, receiptHandoffHoldMs = 0, lingerAfterUnknownMs = 0, postCommitHoldMs = 0 }) {
  return {
    async dispatch(event) {
      const opKey = event.effect.opKey;
      if (mode === 'throw') throw new Error('a6 simulated sync worker throw (definitive, NOT unknown)');
      if (mode === 'throwDefinitive') {
        event.effect.failDefinitive(new Error('a6 simulated definitive failure'), { retryable: true });
        throw new Error('a6 simulated definitive failure');
      }
      if (mode === 'throwDefinitiveHard') {
        event.effect.failDefinitive(new Error('a6 simulated non-retryable failure'), { retryable: false });
        throw new Error('a6 simulated non-retryable failure');
      }
      markerCb('PROVIDER_DISPATCH_CALL');
      const d = await post(stubBase, '/dispatch', { opKey, payload: event.payload }, 60000);
      if (!d.body || !d.body.accepted) throw new Error('stub did not accept: ' + JSON.stringify(d.body));
      markerCb('PROVIDER_ACCEPTED');

      // Receipt (separate mode) or inline.
      let receipt = d.body.receipt || null;
      if (d.body.receiptPending) {
        markerCb('RECEIPT_REQUEST');
        const r = await post(stubBase, '/receipt', { opKey }, 60000);
        markerCb('RECEIPT_BYTES'); // receipt bytes in worker memory
        if (receiptHandoffHoldMs > 0) await sleep(receiptHandoffHoldMs);
        receipt = r.body && r.body.receipt;
      }
      markerCb('RECEIPT_HANDOFF'); // receipt handed to outcome processing

      // WRITE-AHEAD COMMIT: as soon as the outcome is known (provider accept),
      // before returning. This is the module's well-behaved worker contract.
      if (commitDelayMs > 0) {
        markerCb('COMMIT_START');
        await sleep(commitDelayMs);
      }
      const result = { receipt, committed_by: 'a6-worker', op_key: opKey };
      await event.effect.commit(result);
      markerCb('COMMIT_DONE');
      if (postCommitHoldMs > 0) {
        markerCb('POST_COMMIT_HOLD');
        await sleep(postCommitHoldMs);
      }

      if (mode === 'fail') return { status: 'failed', error: 'a6 simulated worker-reported failure' };
      if (lingerAfterUnknownMs > 0) await sleep(lingerAfterUnknownMs);
      return { status: 'ok', receipt, effect: 'a6probe' };
    },
  };
}

// Real scheduler sweep path: reconciler.sweepUnknown with an act() callback
// mirroring MissionScheduler._poll Arrow 1b (complete/hold/retry/fail).
async function sweepOnce(stack, { gracePeriodMs = 0, maxAttempts = 3, act } = {}) {
  return stack.reconciler.sweepUnknown({
    gracePeriodMs,
    maxAttempts,
    act: act || (async () => {}),
  });
}

async function reconcileOnce(stack, opKey, { consequence = 'high', maxAttempts = 3 } = {}) {
  return stack.reconciler.reconcile(opKey, { consequence, maxAttempts });
}

async function operationState(stack, opKey) {
  return stack.reconciler.getOperationState(opKey);
}

async function ledgerRow(stack, opKey) {
  return stack.ledger.get(opKey);
}

async function eventHistory(stack, opKey) {
  return stack.reconciler.queryOp(opKey);
}

// Idempotent coordinator ack (test-only sidecar): exactly-once per op_key.
async function ackIdempotent(stack, opKey, markerCb) {
  if (markerCb) markerCb('ACK_START');
  await stack.pool.query(
    'INSERT INTO a6_ack (op_key) VALUES ($1) ON CONFLICT (op_key) DO NOTHING', [opKey]);
  if (markerCb) markerCb('ACK_DONE');
}
async function ackPresent(stack, opKey) {
  const r = await stack.pool.query('SELECT 1 FROM a6_ack WHERE op_key = $1', [opKey]);
  return r.rowCount > 0;
}

module.exports = {
  REAL, UER, landed, makePool, makeStack, endStack, deriveOpKey,
  makeWorkerRuntime, sweepOnce, reconcileOnce, operationState,
  ledgerRow, eventHistory, ackIdempotent, ackPresent,
};
