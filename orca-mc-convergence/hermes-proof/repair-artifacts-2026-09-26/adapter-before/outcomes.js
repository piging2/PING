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
 * Terminal states of an execution through the adapter:
 *   completed — worker returned a verified 'completed' envelope (canonical
 *               event recorded when an event runtime is injected).
 *   failed    — worker returned a verified 'failed' envelope.
 *   unknown   — no trustworthy worker report: dispatcher timeout, unparsable
 *               worker output, or a post-timeout state the dispatcher cannot
 *               reconcile. Reconcile-vs-retry is owned by the CALLER
 *               (WorkerRuntime / Mission Control), never by this adapter.
 *   denied    — authorization refused before any invocation. Nothing executed.
 *   escalated — worker protocol failure (non-retryable per the proven
 *               contract): the envelope cannot be verified and can NEVER
 *               reach canonical event authority.
 */
const OUTCOME = Object.freeze({
  COMPLETED: 'completed',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
  DENIED: 'denied',
  ESCALATED: 'escalated',
});

function unknownOutcome(reason, detail) {
  return {
    outcome: OUTCOME.UNKNOWN,
    reason,
    detail: detail || {},
    // Invariant: an UNKNOWN outcome must never be treated as a terminal
    // worker verdict. The caller owns reconcile-vs-retry.
    reconcileOwnedBy: 'caller',
  };
}

function terminalOutcome(outcome, fields) {
  if (outcome !== OUTCOME.COMPLETED && outcome !== OUTCOME.FAILED) {
    throw new Error(`terminalOutcome: refusing to label '${outcome}' as a terminal worker verdict`);
  }
  return { outcome, ...(fields || {}) };
}

module.exports = { OUTCOME, unknownOutcome, terminalOutcome };
