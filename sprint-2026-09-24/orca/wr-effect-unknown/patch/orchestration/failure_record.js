'use strict';
/**
 * Failure Record Derivation — mechanical failure-evidence coupling.
 *
 * BACKLOG: FL-20260922-002-invariant (PING.B/F) — "IF A GOVERNED EXECUTION
 * FAILS, THE EXECUTION RESULT ITSELF SHOULD BE SUFFICIENT TO DERIVE THE
 * FAILURE RECORD."
 *
 * This module is the harvested coupling, not a new failure system. It is a
 * pure, dependency-free derivation over the shapes the existing machinery
 * already records:
 *   - the ping_missions row as MissionRuntime.failWithRetry() leaves it
 *     (mission_id, mission_type, status, payload, result, assigned_to,
 *      created_by, created_at, started_at, completed_at, error, retries,
 *      retry_at, lease_until, claimed_at)
 *   - the scheduler dispatch outcome vocabulary from
 *     MissionScheduler._dispatch() P0-3:
 *       'ok'            worker returned a verified ok (not a failure)
 *       'worker_failed' worker returned status:'failed'
 *       'worker_threw'  dispatch threw
 *       'no_worker'     null dispatch — no worker matched the event type
 *       'unknown'       outcome unknowable (timeout/hang; effect_known=false)
 *   - the governing retry policy ({ max_attempts })
 *
 * Standing laws encoded here, mechanically:
 *   - Timeout is an observation, not an effect outcome. An unknown outcome
 *     NEVER resolves to 'failed': it derives outcome:'unknown_hold',
 *     status:'HOLD_RECONCILE', classification:'UNKNOWN_EXECUTION', and the
 *     literal display string "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS".
 *   - Unknown outcomes HOLD and reconcile; no automatic retry is derived
 *     for them (retry safety is unproven for unknown effects).
 *   - Mission state != object state; execution != authorization; agent
 *     output != canonical truth. The record describes the execution only.
 *
 * MC-28 (shared classification vocabulary): the derivation maps the
 * RetryPolicy.determineFailureReason() vocabulary
 * (timeout|network|validation|authorization|not_found|constraint|rate_limit|unknown)
 * onto the FAILURE_LEDGER.md classification vocabulary
 * (TEMPORARY_FAILURE|DEPENDENCY_FAILURE|RATE_LIMIT|AUTH_FAILURE|
 *  TERMINAL_FAILURE|ELIGIBILITY_EMPTY|UNKNOWN_EXECUTION|...). Both fields are
 * carried so no information is lost in the mapping. The mapping table is
 * total: every (outcome, reason, effectKnown, exhausted) combination lands
 * inside the existing vocabulary; nothing is invented.
 *
 * MC-16 (one identity scheme): failure_id is DERIVED —
 *   'fl-' + sha256(mission_id|error|retries|dispatchOutcome).slice(0,12)
 * never minted. The same execution result always yields the same id.
 *
 * Fail-closed: missing mission identity, a non-failure outcome, or an
 * unknown dispatch outcome throws a typed TypeError. A partial record is
 * never returned (a failure must never silently become an empty result).
 */

const crypto = require('crypto');

const DISPATCH_OUTCOMES = new Set(['ok', 'worker_failed', 'worker_threw', 'no_worker', 'unknown']);

/**
 * Harvested from gateway/retry_policy.js RetryPolicy.determineFailureReason().
 * Same pattern order, same vocabulary — kept local so this module stays
 * dependency-free and deterministic (no I/O, no clock except via options).
 */
function determineFailureReason(errorText) {
  const msg = String(errorText || '').toLowerCase();
  // Note: adds 'timed out' to the harvested RetryPolicy pattern set ('timeout'
  // alone misses the common 'timed out' phrasing; RetryPolicy itself has this gap).
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline')) return 'timeout';
  if (msg.includes('connection') || msg.includes('network')) return 'network';
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('malformed')) return 'validation';
  if (msg.includes('authentication') || msg.includes('authorization')) return 'authorization';
  if (msg.includes('not found')) return 'not_found';
  if (msg.includes('constraint') || msg.includes('duplicate') || msg.includes('already exists')) return 'constraint';
  if (msg.includes('rate limit') || msg.includes('throttle') || msg.includes('429')) return 'rate_limit';
  return 'unknown';
}

/**
 * MC-28: total mapping from (dispatchOutcome, failureReason, effectKnown,
 * exhausted) to the FAILURE_LEDGER.md classification vocabulary.
 */
function classifyFailure({ dispatchOutcome, failureReason, effectKnown, exhausted }) {
  if (!effectKnown || dispatchOutcome === 'unknown') return 'UNKNOWN_EXECUTION';
  if (dispatchOutcome === 'no_worker') return 'ELIGIBILITY_EMPTY';
  switch (failureReason) {
    case 'timeout': return 'TEMPORARY_FAILURE';
    case 'network': return 'DEPENDENCY_FAILURE';
    case 'rate_limit': return 'RATE_LIMIT';
    case 'authorization': return 'AUTH_FAILURE';
    case 'validation':
    case 'constraint':
    case 'not_found': return 'TERMINAL_FAILURE';
    case 'unknown':
    default:
      // RetryPolicy treats unknown errors as retryable; the classification
      // mirrors the mechanical retry decision, never invents a failure kind.
      return exhausted ? 'TERMINAL_FAILURE' : 'TEMPORARY_FAILURE';
  }
}

/**
 * Standing law: unknown outcomes HOLD, never resolve to FAILED.
 */
function resolveOutcome({ dispatchOutcome, effectKnown, exhausted }) {
  if (!effectKnown || dispatchOutcome === 'unknown') {
    return {
      outcome: 'unknown_hold',
      status: 'HOLD_RECONCILE',
      display: 'OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS',
    };
  }
  if (exhausted) return { outcome: 'failed', status: 'OPEN', display: null };
  return { outcome: 'retry_scheduled', status: 'OPEN', display: null };
}

/**
 * self_heal: the bounded recovery the machinery already took or must take,
 * derived from the retry counters — never a new recovery invented here.
 */
function deriveSelfHeal({ dispatchOutcome, effectKnown, exhausted, retries, maxAttempts, retryAt }) {
  if (!effectKnown || dispatchOutcome === 'unknown') {
    return 'none: held for reconciliation; no automatic retry (retry safety unproven for unknown effects)';
  }
  if (exhausted) {
    return `exhausted after ${retries}/${maxAttempts} attempts: routed to dead-letter queue (recordDeadLetter)`;
  }
  const gate = retryAt ? ` (backoff gate at ${retryAt})` : ' (backoff gate pending)';
  return `bounded retry scheduled: attempt ${retries + 1}/${maxAttempts}${gate}`;
}

function outcomePhrase(dispatchOutcome) {
  switch (dispatchOutcome) {
    case 'worker_failed': return 'failed in worker';
    case 'worker_threw': return 'threw in worker';
    case 'no_worker': return 'had no matching worker';
    case 'unknown': return 'ended with unknown outcome';
    default: return dispatchOutcome;
  }
}

// Deterministic canonical JSON (sorted keys) for digests and id derivation.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function sha256hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Derive a ledger-shaped failure record from a governed execution result.
 *
 * @param {object} executionResult
 * @param {object} executionResult.mission — ping_missions row
 * @param {object} executionResult.dispatch — { outcome, worker, error, effect_known }
 * @param {object} [executionResult.policy] — { max_attempts } (default 3, the scheduler default)
 * @param {string} [executionResult.correlation_id]
 * @param {string} [executionResult.causation_id]
 * @param {object} [options]
 * @param {string} [options.now] — ISO timestamp override for first_seen fallback (determinism in tests)
 * @returns {object} failure record; every field derived from executionResult alone
 * @throws {TypeError} on missing identity, non-failure outcome, or unknown outcome vocabulary
 */
function deriveFailureRecord(executionResult, options = {}) {
  if (!executionResult || typeof executionResult !== 'object') {
    throw new TypeError('deriveFailureRecord: executionResult is required');
  }
  const { mission, dispatch, policy = {}, correlation_id = null, causation_id = null } = executionResult;

  // Fail-closed validation: identity first, vocabulary second. Never partial.
  if (!mission || typeof mission.mission_id !== 'string' || mission.mission_id.length === 0) {
    throw new TypeError('deriveFailureRecord: missing required field mission.mission_id');
  }
  if (typeof mission.mission_type !== 'string' || mission.mission_type.length === 0) {
    throw new TypeError('deriveFailureRecord: missing required field mission.mission_type');
  }
  if (!dispatch || typeof dispatch.outcome !== 'string' || !DISPATCH_OUTCOMES.has(dispatch.outcome)) {
    throw new TypeError(
      `deriveFailureRecord: unknown dispatch outcome '${dispatch && dispatch.outcome}' (expected one of ${[...DISPATCH_OUTCOMES].join(', ')})`
    );
  }
  if (dispatch.outcome === 'ok') {
    throw new TypeError('deriveFailureRecord: not a failure (dispatch outcome ok)');
  }

  const maxAttempts = Number.isInteger(policy.max_attempts) && policy.max_attempts > 0 ? policy.max_attempts : 3;
  const retries = Number.isInteger(mission.retries) ? mission.retries : 0;
  const exhausted = retries >= maxAttempts;
  const effectKnown = dispatch.effect_known !== false; // unknown unless explicitly false
  const error = dispatch.error != null ? String(dispatch.error) : (mission.error != null ? String(mission.error) : null);

  const failureReason = determineFailureReason(error);
  const classification = classifyFailure({ dispatchOutcome: dispatch.outcome, failureReason, effectKnown, exhausted });
  const resolved = resolveOutcome({ dispatchOutcome: dispatch.outcome, effectKnown, exhausted });
  const selfHeal = deriveSelfHeal({
    dispatchOutcome: dispatch.outcome, effectKnown, exhausted, retries, maxAttempts, retryAt: mission.retry_at || null,
  });

  const failureId = `fl-${sha256hex([mission.mission_id, error || '', String(retries), dispatch.outcome].join('|')).slice(0, 12)}`;
  const firstSeen = mission.completed_at || options.now || new Date().toISOString();

  let durationMs = null;
  if (mission.started_at && mission.completed_at) {
    const d = Date.parse(mission.completed_at) - Date.parse(mission.started_at);
    durationMs = Number.isFinite(d) && d >= 0 ? d : null;
  }

  const payloadDigest = sha256hex(stableStringify(mission.payload === undefined ? null : mission.payload));

  const whatFailed = error
    ? `mission ${mission.mission_type} (${mission.mission_id}) ${outcomePhrase(dispatch.outcome)}: ${error}`
    : `mission ${mission.mission_type} (${mission.mission_id}) ${outcomePhrase(dispatch.outcome)}: no error text recorded`;

  return {
    failure_id: failureId,
    first_seen: firstSeen,
    system: 'ping-mission-substrate',
    lane: 'interactions-orchestration',
    what_failed: whatFailed,
    evidence: {
      mission_id: mission.mission_id,
      mission_type: mission.mission_type,
      correlation_id,
      causation_id,
      error,
      retries,
      max_attempts: maxAttempts,
      assigned_to: mission.assigned_to || null,
      worker: dispatch.worker || null,
      started_at: mission.started_at || null,
      completed_at: mission.completed_at || null,
      duration_ms: durationMs,
      payload_digest: payloadDigest,
    },
    failure_reason: failureReason,
    classification,
    outcome: resolved.outcome,
    display: resolved.display,
    self_heal: selfHeal,
    replay: {
      mission_id: mission.mission_id,
      mission_type: mission.mission_type,
      payload_digest: payloadDigest,
      worker: dispatch.worker || null,
      dispatch_outcome: dispatch.outcome,
      correlation_id,
    },
    status: resolved.status,
  };
}

module.exports = {
  deriveFailureRecord,
  determineFailureReason,
  classifyFailure,
  DISPATCH_OUTCOMES: [...DISPATCH_OUTCOMES],
};

