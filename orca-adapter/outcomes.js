'use strict';
/**
 * Execution outcome vocabulary — LANE C (Orca headless-agent adapter).
 *
 * ARCHITECTURAL POINT (Nolan, binding): UNKNOWN is not an error code; it is a
 * fundamental distributed-systems state. A worker that did not report back may
 * have completed, failed, or never started — and the dispatcher cannot tell
 * which. The adapter propagates UNKNOWN honestly to the caller; it NEVER
 * collapses UNKNOWN into success, failure, or no-match.
 *
 * EFFECT-STATE DIMENSION (DEFECT-2 closure, 2026-09-26; Batch 7 external-effect
 * policy): the outcome verdict (completed/failed/unknown/denied/escalated) is
 * orthogonal to the EXTERNAL-EFFECT state. Per Q10/Batch-7, once execution
 * might have crossed an external-effect boundary, the effect state is
 * EFFECT_UNKNOWN — never inferred clean. A verified COMPLETED envelope from a
 * capability with any external-effect possibility records EFFECT_UNKNOWN.
 * Worker self-report (evidence.capabilityPerformed) is a claim, not
 * verification (O5): it can never promote EFFECT_UNKNOWN to EFFECT_NONE.
 * EFFECT_NONE is currently ungrantable through this adapter — no agent profile
 * defines an independent effect-verification method. The vocabulary exists so
 * a future capability class can define one explicitly.
 *
 * Terminal states of an execution through the adapter:
 *   completed — worker returned a verified 'completed' envelope (canonical
 *               event recorded when an event runtime is injected).
 *               effect_state is ALWAYS explicit; completed-without-verified-
 *               effects records effect_unknown, never clean success.
 *   failed    — worker returned a verified 'failed' envelope. A verified
 *               failure is not proof of no-effect: effect_unknown.
 *   unknown   — no trustworthy worker report: dispatcher timeout, unparsable
 *               worker output, or a post-timeout state the dispatcher cannot
 *               reconcile. Reconcile-vs-retry is owned by the CALLER
 *               (WorkerRuntime / Mission Control), never by this adapter.
 *               effect_unknown by construction.
 *   denied    — authorization refused before any invocation. Nothing executed:
 *               effect_none.
 *   escalated — worker protocol failure (non-retryable per the proven
 *               contract): the envelope cannot be verified and can NEVER
 *               reach canonical event authority. effect_unknown.
 *
 * EFFECT_HOLD: the caller-owned reconcile state. The adapter never retries;
 * when the caller takes ownership of an effect_unknown outcome for
 * reconcile-vs-retry, it marks the record effect_hold (via effectHold()).
 * HOLD never auto-retries an external effect (Batch-7: reconcile before
 * retry; revocation blocks new dispatch immediately).
 */
const OUTCOME = Object.freeze({
  COMPLETED: 'completed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
  DENIED: 'denied',
  ESCALATED: 'escalated',
});

const EFFECT_STATE = Object.freeze({
  UNKNOWN: 'effect_unknown',
  HOLD: 'effect_hold',
  NONE: 'effect_none',
});

function isEffectState(v) {
  return v === EFFECT_STATE.UNKNOWN || v === EFFECT_STATE.HOLD || v === EFFECT_STATE.NONE;
}

function stripEffectState(f) {
  const out = { ...(f || {}) };
  delete out.effect_state;
  return out;
}

function unknownOutcome(reason, detail) {
  return {
    outcome: OUTCOME.UNKNOWN,
    reason,
    detail: detail || {},
    // Invariant: an UNKNOWN outcome must never be treated as a terminal
    // worker verdict. The caller owns reconcile-vs-retry.
    reconcileOwnedBy: 'caller',
    // An unreconciled execution may still be running: its effects are unknown.
    effect_state: EFFECT_STATE.UNKNOWN,
  };
}

function terminalOutcome(outcome, fields) {
  if (outcome !== OUTCOME.COMPLETED && outcome !== OUTCOME.FAILED) {
    throw new Error(`terminalOutcome: refusing to label '${outcome}' as a terminal worker verdict`);
  }
  const f = fields || {};
  if (outcome === OUTCOME.COMPLETED) {
    // DEFECT-2: a verified completion must carry an explicit effect state.
    // Completed-but-unverified records effect_unknown — NEVER clean success.
    // effect_none is accepted only when the caller passes it explicitly, and
    // it is currently ungrantable: no agent profile defines an independent
    // effect-verification method (worker self-report is not verification, O5).
    if (!isEffectState(f.effect_state)) {
      throw new Error('terminalOutcome: COMPLETED requires an explicit effect_state (effect_unknown | effect_hold | effect_none)');
    }
    return { outcome, effect_state: f.effect_state, ...stripEffectState(f) };
  }
  // Verified failure is not proof of no-effect (exit-1 != no-effect, Q10).
  return { outcome, effect_state: isEffectState(f.effect_state) ? f.effect_state : EFFECT_STATE.UNKNOWN, ...stripEffectState(f) };
}

/**
 * Caller-owned transition: mark an effect_unknown record as reconciling.
 * The caller (WorkerRuntime / Mission Control) calls this when it takes
 * ownership of reconcile-vs-retry for an outcome whose effects are unknown.
 * Pure: does not mutate the input.
 */
function effectHold(record, reason) {
  if (!record || typeof record !== 'object') {
    throw new Error('effectHold: record required');
  }
  if (record.effect_state !== EFFECT_STATE.UNKNOWN) {
    throw new Error(`effectHold: refusing to HOLD a record whose effect_state is '${record.effect_state}' (only effect_unknown may transition to effect_hold)`);
  }
  return {
    ...record,
    effect_state: EFFECT_STATE.HOLD,
    effect_hold_reason: reason || 'caller-owned reconciliation in progress',
    effect_hold_at: new Date().toISOString(),
    reconcileOwnedBy: 'caller',
  };
}

module.exports = { OUTCOME, EFFECT_STATE, unknownOutcome, terminalOutcome, effectHold, isEffectState };
