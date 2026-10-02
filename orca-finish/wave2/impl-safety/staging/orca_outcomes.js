/**
 * orca_outcomes.js — Outcome vocabulary with fail-closed UNKNOWN semantics.
 *
 * ADAPT of orka-outcome-unknown-fail-closed + DBOS-STEP-RECORDING, with the
 * binding red-team hardening:
 *
 *  - The side-effect boundary is an EXTERNALLY OBSERVABLE ack (provider ack,
 *    transport ack, or an independent re-read of world state). It is NEVER a
 *    local state-machine position. A worker whose request bytes left the
 *    socket but died before the local ack was processed is post-boundary:
 *    "cannot be proven uncrossed" settles to OUTCOME_UNKNOWN, never to a
 *    requeue.
 *  - Every OUTCOME_UNKNOWN record cites last-observed evidence. An UNKNOWN
 *    write without evidence is refused (this closes the "evidence-free
 *    unknown" attack where a compromised coordinator launders a failure into
 *    an honest-looking terminal state).
 *  - Recovery NEVER replays a possibly-accepted prompt. Blind retry of an
 *    OUTCOME_UNKNOWN effect is a thrown error; the only legal path is
 *    reconcileUnknown, which resolves by evidence (idempotency key +
 *    independent verification), never by re-submission.
 *  - Steps carry effect-class labels: TRANSACTIONAL (record and effect commit
 *    atomically: recorded = done, never re-executed), IDEMPOTENT_EXTERNAL
 *    (re-execution safe via provider idempotency key), AT_LEAST_ONCE_EXTERNAL
 *    (re-execution possible; outcomes are claims until verified).
 *  - Step records are written only by the step owner's identity (writer
 *    spoofing refused).
 *  - tenant_id is mandatory on every record (O-1 hardening).
 *
 * Outcome vocabulary (shared with the impl-state lane's attempt statuses):
 * NOT_STARTED / STARTED / SUCCEEDED / FAILED / OUTCOME_UNKNOWN.
 * OUTCOME_UNKNOWN is a unique durable terminal value, never empty or omitted.
 */

'use strict';

const OUTCOMES = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  STARTED: 'STARTED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  OUTCOME_UNKNOWN: 'OUTCOME_UNKNOWN',
});

const EFFECT_CLASSES = Object.freeze({
  TRANSACTIONAL: 'TRANSACTIONAL',
  IDEMPOTENT_EXTERNAL: 'IDEMPOTENT_EXTERNAL',
  AT_LEAST_ONCE_EXTERNAL: 'AT_LEAST_ONCE_EXTERNAL',
});

class ErrMissingEvidence extends Error {
  constructor(msg) {
    super(msg || 'OUTCOME_UNKNOWN requires a last-observed-evidence citation');
    this.name = 'ErrMissingEvidence';
    this.code = 'ERR_MISSING_EVIDENCE';
  }
}

class ErrBlindRetry extends Error {
  constructor(effectId) {
    super(
      `blind retry of OUTCOME_UNKNOWN effect refused: ${effectId}. ` +
      'Route through reconcileUnknown with idempotency key and independent verification.'
    );
    this.name = 'ErrBlindRetry';
    this.code = 'ERR_BLIND_RETRY';
  }
}

class ErrWriterMismatch extends Error {
  constructor(writerId, stepOwner) {
    super(`step record writer ${writerId} is not the step owner ${stepOwner}`);
    this.name = 'ErrWriterMismatch';
    this.code = 'ERR_WRITER_MISMATCH';
  }
}

class ErrBadRecord extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'ErrBadRecord';
    this.code = 'ERR_BAD_RECORD';
  }
}

function requireTenant(tenantId) {
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new ErrBadRecord('tenant_id is mandatory on every outcome record');
  }
}

/**
 * Evidence is the externally observable fact the classification rests on.
 * Shape: { kind, observedAt, detail } where kind names the boundary, e.g.
 * 'provider_ack', 'transport_ack', 'world_state_reread', 'no_dispatch_recorded'.
 * Empty detail or a missing kind is not evidence.
 */
function assertEvidence(evidence) {
  if (!evidence || typeof evidence.kind !== 'string' || evidence.kind.length === 0 ||
      typeof evidence.observedAt !== 'string' || evidence.observedAt.length === 0) {
    throw new ErrMissingEvidence();
  }
  return evidence;
}

/**
 * Classify a failure that interrupted an effect.
 *
 * @param {object} spec
 * @param {boolean} spec.dispatchObserved - did the effect's request bytes ever
 *   leave toward the provider (locally observed dispatch)? If unknown, pass
 *   true: "cannot be proven uncrossed" settles to UNKNOWN, never to requeue.
 * @param {boolean} spec.ackObserved - was an externally observable ack
 *   (provider ack, transport ack, verified world-state change) recorded?
 * @param {object} spec.lastObservedEvidence - the evidence citation, required
 *   whenever the classification is OUTCOME_UNKNOWN.
 *
 * @returns 'FAILED' (pre-boundary, safe to requeue) or 'OUTCOME_UNKNOWN'
 *   (post-boundary or unprovable, terminal, never blindly retried).
 */
function classifyFailure({ dispatchObserved, ackObserved, lastObservedEvidence }) {
  // Provably pre-boundary: no dispatch ever observed. Safe to requeue.
  if (dispatchObserved === false && ackObserved === false) {
    return OUTCOMES.FAILED;
  }
  // Boundary crossed (ack observed) or cannot be proven uncrossed:
  // terminal OUTCOME_UNKNOWN with cited evidence. No replay.
  assertEvidence(lastObservedEvidence);
  return OUTCOMES.OUTCOME_UNKNOWN;
}

/**
 * Write an OUTCOME_UNKNOWN record. Pure constructor; the durable write itself
 * belongs to the journal (one-writer rule). The record is refused without a
 * last-observed-evidence citation.
 */
function writeUnknown({ tenantId, attemptId, effectId, effectClass, writerId, lastObservedEvidence, note }) {
  requireTenant(tenantId);
  if (!attemptId || !effectId) throw new ErrBadRecord('attemptId and effectId are required');
  if (!Object.values(EFFECT_CLASSES).includes(effectClass)) {
    throw new ErrBadRecord(`unknown effect class: ${JSON.stringify(effectClass)}`);
  }
  assertEvidence(lastObservedEvidence);
  return Object.freeze({
    outcome: OUTCOMES.OUTCOME_UNKNOWN,
    tenantId,
    attemptId,
    effectId,
    effectClass,
    writerId: writerId || null,
    lastObservedEvidence: Object.freeze({ ...lastObservedEvidence }),
    note: note || 'outcome is unknown and was not replayed',
    recordedAt: new Date().toISOString(),
    replayed: false,
  });
}

/**
 * Record a step outcome. Enforces writer identity: only the step owner may
 * write its record (closes the writer-spoofing attack from the DBOS verdict).
 */
function recordStep({ tenantId, writerId, stepOwner, stepId, attemptId, outcome, effectClass, idempotencyKey, lastObservedEvidence }) {
  requireTenant(tenantId);
  if (writerId !== stepOwner) throw new ErrWriterMismatch(writerId, stepOwner);
  if (!Object.values(OUTCOMES).includes(outcome)) throw new ErrBadRecord(`unknown outcome: ${outcome}`);
  if (outcome === OUTCOMES.OUTCOME_UNKNOWN) {
    return writeUnknown({ tenantId, attemptId, effectId: stepId, effectClass, writerId, lastObservedEvidence });
  }
  if (effectClass === EFFECT_CLASSES.AT_LEAST_ONCE_EXTERNAL && outcome === OUTCOMES.SUCCEEDED && !idempotencyKey) {
    // At-least-once external success without an idempotency key is a claim,
    // not a verified completion; the record says so explicitly.
    return Object.freeze({
      outcome, tenantId, attemptId, effectId: stepId, effectClass, writerId,
      verified: false, claim: 'claimed-done: no idempotency key, unverified',
      recordedAt: new Date().toISOString(),
    });
  }
  return Object.freeze({
    outcome, tenantId, attemptId, effectId: stepId, effectClass, writerId,
    recordedAt: new Date().toISOString(),
  });
}

/**
 * Blind retry of an effect record. This is the recovery-path guard: retrying
 * an OUTCOME_UNKNOWN effect is a thrown error, always. The caller must go
 * through reconcileUnknown.
 */
function retryEffect(effectRecord) {
  if (!effectRecord || typeof effectRecord.outcome !== 'string') {
    throw new ErrBadRecord('retryEffect requires an effect record with an outcome');
  }
  if (effectRecord.outcome === OUTCOMES.OUTCOME_UNKNOWN) {
    throw new ErrBlindRetry(effectRecord.effectId || effectRecord.stepId || 'unknown');
  }
  if (effectRecord.outcome === OUTCOMES.SUCCEEDED) {
    throw new ErrBadRecord('retry of a SUCCEEDED effect refused: nothing to retry');
  }
  // FAILED (pre-boundary) effects are the only retryable ones.
  return { retryable: true, effectId: effectRecord.effectId || effectRecord.stepId };
}

/**
 * Reconcile an OUTCOME_UNKNOWN effect. This is the ONLY legal path out of
 * UNKNOWN. It never re-submits the effect; it resolves by evidence:
 *
 *  - verifyWorld: an independent re-read of world state, () => { observed: boolean }.
 *    observed === true  -> SUCCEEDED (verified, not claimed).
 *    observed === false -> FAILED (verified absent; safe to re-issue as a NEW
 *      effect with a fresh idempotency key, never as a retry of this one).
 *  - If verification is inconclusive (verifyWorld throws or returns
 *    non-boolean), the record stays OUTCOME_UNKNOWN with the new evidence
 *    appended. UNKNOWN is never converted to SUCCESS.
 *
 * For IDEMPOTENT_EXTERNAL effects the idempotencyKey must be supplied so a
 * re-issue, if the coordinator later chooses one, is provider-safe.
 */
function reconcileUnknown(record, { verifyWorld, idempotencyKey, newEvidence, reconcilerId }) {
  if (!record || record.outcome !== OUTCOMES.OUTCOME_UNKNOWN) {
    throw new ErrBadRecord('reconcileUnknown applies only to OUTCOME_UNKNOWN records');
  }
  if (record.effectClass === EFFECT_CLASSES.IDEMPOTENT_EXTERNAL && !idempotencyKey) {
    throw new ErrBadRecord('reconciling an IDEMPOTENT_EXTERNAL effect requires its idempotency key');
  }
  let verification;
  try {
    verification = verifyWorld();
  } catch (e) {
    verification = { inconclusive: true, error: String(e && e.message || e) };
  }
  const evidence = [record.lastObservedEvidence];
  if (newEvidence) evidence.push(assertEvidence(newEvidence));

  if (verification && verification.observed === true) {
    return Object.freeze({
      ...record,
      outcome: OUTCOMES.SUCCEEDED,
      verified: true,
      reconciledBy: reconcilerId || null,
      reconciledAt: new Date().toISOString(),
      evidence: Object.freeze(evidence),
    });
  }
  if (verification && verification.observed === false) {
    return Object.freeze({
      ...record,
      outcome: OUTCOMES.FAILED,
      verified: true,
      verificationNote: 'verified absent in world state; re-issue only as a new effect with a fresh idempotency key',
      reconciledBy: reconcilerId || null,
      reconciledAt: new Date().toISOString(),
      evidence: Object.freeze(evidence),
    });
  }
  // Inconclusive: stays UNKNOWN. Ambiguity is terminal and explicit.
  return Object.freeze({
    ...record,
    verificationAttempt: verification && verification.error ? String(verification.error) : 'inconclusive',
    reconciledBy: reconcilerId || null,
    reconciledAt: new Date().toISOString(),
    evidence: Object.freeze(evidence),
  });
}

/**
 * Branch wiring seam: derive the provider idempotency key for an external
 * effect from the branch's stable work-order identity. The branch derives
 * work_order_id from (objective_id, task_key)
 * (objective-runtime.js:71 deriveWorkOrderId) so a restart rediscovers the
 * same id instead of minting a new one; using it as the idempotency key
 * makes any later re-issue provider-safe instead of duplicate-executing.
 *
 * @param {function} deriveWorkOrderId - the branch's deriveWorkOrderId
 *   (injected; (objectiveId, taskKey) => hex).
 */
function idempotencyKeyFor(deriveWorkOrderId, objectiveId, taskKey) {
  if (typeof deriveWorkOrderId !== 'function') {
    throw new ErrBadRecord('idempotencyKeyFor: deriveWorkOrderId function required');
  }
  return deriveWorkOrderId(objectiveId, taskKey);
}

module.exports = {
  OUTCOMES,
  EFFECT_CLASSES,
  ErrMissingEvidence,
  ErrBlindRetry,
  ErrWriterMismatch,
  ErrBadRecord,
  classifyFailure,
  writeUnknown,
  recordStep,
  retryEffect,
  reconcileUnknown,
  idempotencyKeyFor,
};
