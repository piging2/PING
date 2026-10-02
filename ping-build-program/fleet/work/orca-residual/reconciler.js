/**
 * reconciler.js — ORCA residual lane (2026-09-24)
 *
 * Reconcile-before-retry for the UNKNOWN-outcome problem.
 *
 * THE BUG (T2, proven live on the Pig): worker effect completes, the drop
 * lands on disk, the coordinator times out, discards the drop, records a
 * false WORKER_FAILED, and auto-retries -> the same logical operation
 * produces TWO consequential effects.
 *
 * THE FIX (this module): never `timeout -> assume failed -> retry`.
 * Model the outcome explicitly:
 *
 *   DISPATCHED -> SUCCEEDED -> RESULT RECORDED        (happy path)
 *   DISPATCHED -> UNKNOWN   -> RECONCILE              (timeout / ack lost)
 *
 * reconcile(opKey) implements Nolan's rule:
 *   - effect succeeded  -> recover the recorded result, NEVER re-dispatch
 *   - definitely failed -> retry authorized (new attempt, same op_key)
 *   - still unknown     -> hold/escalate per consequence, NEVER blind retry
 *
 * AUTHORITY CLASSIFICATION (by capability, not filename):
 * This module is a PROCEDURE, not an authority. It owns no state: every
 * fact it reads comes from ping_events via the existing UnifiedEventRuntime
 * interface; every fact it writes goes back through emit(). It creates no
 * competing truth, no new store, no workflow engine. UnifiedEventRuntime
 * remains the sole event authority; MissionRuntime remains the sole mission
 * authority. Port: this file requires only
 *   journal.emit(eventType, source, payload, {logical_id, correlation_id, causation_id})
 *   journal.query({eventType, source, limit})            // newest-first
 *   journal.queryOp(opKey)                               // EFFECT_* oldest-first
 * all of which the real UnifiedEventRuntime satisfies (queryOp is a
 * client-side filter over query(); on the live substrate it is one indexed
 * query on event_type + a payload filter).
 *
 * New event types (register in gateway/generated/event_registry.json on port):
 *   EFFECT_DISPATCHED, EFFECT_SUCCEEDED, EFFECT_FAILED,
 *   EFFECT_UNKNOWN, EFFECT_RECONCILED, EFFECT_HELD
 */
'use strict';

const EFFECT_TYPES = new Set([
  'EFFECT_DISPATCHED', 'EFFECT_SUCCEEDED', 'EFFECT_FAILED',
  'EFFECT_UNKNOWN', 'EFFECT_RECONCILED', 'EFFECT_HELD',
]);

/**
 * Reconcile the outcome of one logical operation.
 *
 * @param {string} opKey — stable idempotency key (see idempotency.js)
 * @param {object} deps
 * @param {object} deps.journal — {emit, query, queryOp}
 * @param {object} deps.effector — {probe(opKey)} -> {executed:true|false|'unknown', result?}
 * @param {string} deps.consequence — 'high' (consequential: hold on unknown) | 'low'
 * @param {number} deps.maxAttempts
 * @param {string} deps.correlationId
 * @returns {Promise<object>} resolution:
 *   {resolution:'recovered', via, result} |
 *   {resolution:'retry_authorized', nextAttempt, reason} |
 *   {resolution:'held', reason} |
 *   {resolution:'failed_terminal', error}
 */
async function reconcile(opKey, deps) {
  const { journal, effector, consequence = 'high', maxAttempts = 3, correlationId = opKey } = deps;
  const history = await journal.queryOp(opKey);
  const ofType = (t) => history.filter(e => e.event_type === t);
  const attempts = ofType('EFFECT_DISPATCHED').length;

  // 1. A durable SUCCEEDED record is terminal: recover, never re-dispatch.
  //    This is the T2 fix: the worker's write-ahead EFFECT_SUCCEEDED survives
  //    the coordinator's timeout and discarded drop.
  const succeeded = ofType('EFFECT_SUCCEEDED')[0];
  if (succeeded) {
    return { resolution: 'recovered', via: 'durable_succeeded_event', result: succeeded.payload.result };
  }

  // 2. A definitive FAILED record: retry only if retryable and attempts remain.
  const failed = ofType('EFFECT_FAILED');
  if (failed.length > 0) {
    const last = failed[failed.length - 1];
    if (!last.payload.retryable) {
      return { resolution: 'failed_terminal', error: last.payload.error };
    }
    if (attempts < maxAttempts) {
      return { resolution: 'retry_authorized', nextAttempt: attempts + 1, reason: 'definitive_retryable_failure' };
    }
    return { resolution: 'failed_terminal', error: 'attempts_exhausted: ' + last.payload.error };
  }

  // 3. No outcome on record: DISPATCHED -> UNKNOWN -> probe the effector.
  //    The probe asks the only party that can know: the executor's own
  //    executed-op log (in T2's world, the drop file on disk IS this log).
  let probe = { executed: 'unknown' };
  try {
    probe = await effector.probe(opKey);
  } catch (err) {
    probe = { executed: 'unknown', probeError: String(err && err.message || err) };
  }

  if (probe.executed === true) {
    await journal.emit('EFFECT_RECONCILED', 'reconciler', {
      op_key: opKey, resolution: 'recovered_via_probe',
      detail: 'no SUCCEEDED event, but effector confirms execution; result recovered from probe',
    }, { logical_id: `reconciled:${opKey}:${history.length}`, correlation_id: correlationId });
    return { resolution: 'recovered', via: 'effector_probe', result: probe.result };
  }
  if (probe.executed === false) {
    // The effect definitely never ran: re-dispatch is safe.
    return { resolution: 'retry_authorized', nextAttempt: attempts + 1, reason: 'probe_confirms_never_executed' };
  }

  // 4. Still unknown: hold/escalate per consequence. NEVER blind retry.
  await journal.emit('EFFECT_HELD', 'reconciler', {
    op_key: opKey,
    reason: 'outcome unknown after probe; blind retry would risk a second consequential effect',
    consequence,
    escalated_to: 'operator',
  }, { logical_id: `held:${opKey}:${history.length}`, correlation_id: correlationId });
  if (consequence === 'high') {
    return { resolution: 'held', reason: 'unknown_outcome_consequential_effect' };
  }
  // Low-consequence effects: bounded, explicitly risk-accepted retry.
  if (attempts < maxAttempts) {
    return { resolution: 'retry_authorized', nextAttempt: attempts + 1, reason: 'unknown_outcome_low_consequence_risk_accepted' };
  }
  return { resolution: 'held', reason: 'unknown_outcome_attempts_exhausted' };
}

module.exports = { reconcile, EFFECT_TYPES };
