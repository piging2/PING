'use strict';
/**
 * effect_ledger.js — post-effect promotion records for the LANE C adapter.
 *
 * GAP CLOSED (2026-09-30): post-effect definitive throw had no promotion
 * path to FAILED. A verified completion after a proven external effect
 * records effect_unknown (safe), but when DEFINITIVE failure evidence
 * arrived there was no typed promotion to FAILED. Now there is.
 *
 * FINISH doctrine: UNKNOWN reconciles evidence first, never blind-retries.
 * Terminal states: PENDING / RUNNING / SUCCEEDED / FAILED / CANCELLED /
 * UNKNOWN. This module adds the missing arrow: effect_unknown (or
 * effect_hold) -> FAILED, gated on typed definitive failure evidence.
 *
 * THROW DISCIPLINE (sharpened 2026-09-30 from the /home/nolan/ping
 * falsification: the Pig chain promotes a bare post-effect throw to FAILED
 * with no effect evidence at all — a real defect there). Three cases:
 *  - PROVEN pre-effect (no effect possible: the throw happened before any
 *    effect boundary): FAILED directly through terminalOutcome is allowed.
 *    Nothing exists to reconcile.
 *  - Post-effect throw WITH definitive failure evidence PLUS an effect
 *    record: FAILED with the evidence cited, via promoteEffect() below.
 *  - Post-effect throw with UNKNOWN effect state (no evidence, or only
 *    partial evidence): HOLD / reconcile, NEVER FAILED. promoteEffect()
 *    refuses and points the caller at effect_hold. A bare throw is never
 *    evidence of failure.
 *
 * Design constraints (all honored here):
 *  - Effect records are APPEND-ONLY. Nothing in this module mutates a
 *    record it did not create. Promotion APPENDS a promotion record that
 *    cites the evidence; history is never rewritten.
 *  - effect_id is deterministic: 'effect_' + sha256(dispatch_key + ':' +
 *    attempt)[0:16], the same deterministic-id discipline as the approval
 *    plane (timestamp-free inputs, so the same logical effect derives the
 *    same id on replay).
 *  - A promotion record carries dispatch_key, attempt, the from/to states,
 *    failure evidence refs, promoted_at, and the promotion cause.
 *  - effect_unknown -> FAILED happens ONLY when definitive failure evidence
 *    is presented (typed, with evidence refs cited). Without definitive
 *    evidence the outcome stays effect_unknown / effect_hold and is NEVER
 *    promoted. No blind promotion exists in this module.
 *  - Replaying the same promotion is idempotent: the same dispatch_key +
 *    attempt derives the same effect_id, so a second promotion is detected
 *    as a replay and returns the EXISTING promotion record. No duplicate.
 *  - Evidence vocabulary is the 10 effect classes surveyed in
 *    orca/effect-classes/ (01 filesystem-mutation through 10
 *    financial-action). Every class produces well-formed evidence refs; a
 *    class with no support is explicitly marked, never silently accepted.
 *  - NO NEW AUTHORITY: this is a derivation inside the existing outcome
 *    path (outcomes.js terminalOutcome / failedFromEffectPromotion), not a
 *    new store or service. The "ledger" here is a plain append-only array
 *    owned by the caller (file-local derivation); every function is pure
 *    and returns a new ledger array when it appends.
 */
const crypto = require('crypto');
const { terminalOutcome, EFFECT_STATE } = require('./outcomes.js');

// The 10 effect classes from orca/effect-classes/. effect_class ids are the
// survey filenames' slugs. `probe` is the survey's own reconcile vocabulary
// (Q3/Q4) for what counts as definitive failure evidence for that class.
// `supported` is explicit: every class is supported for evidence refs today;
// the flag exists so a class can be marked unsupported without code edits
// elsewhere. Partial coverage is noted in the probe text, never hidden.
const EFFECT_CLASSES = Object.freeze([
  { index: 1, id: 'filesystem-mutation', label: 'Filesystem Mutation', supported: true,
    probe: 'read back + content-hash compare; git status/diff for repo files' },
  { index: 2, id: 'git-mutation', label: 'Git Mutation', supported: true,
    probe: 'commits table lookup by (patch_id, mission_id); git log --grep marker' },
  { index: 3, id: 'database-mutation', label: 'Database Mutation', supported: true,
    probe: 'SELECT by event_id or natural key; event_processing processed flag; outbox published flag' },
  { index: 4, id: 'deployment', label: 'Deployment', supported: true,
    probe: 'deployment_registry status; runtime heartbeat; container/image digest check' },
  { index: 5, id: 'connector-write', label: 'Connector Write', supported: true,
    probe: 'Sent folder search (email connector); events get/list by eventId (events connector)' },
  { index: 6, id: 'external-api-mutation', label: 'External API Mutation', supported: true,
    probe: 'provider state machine poll until terminal; GET resource state' },
  { index: 7, id: 'website-publish', label: 'Website Publish', supported: true,
    probe: 'deployments state poll until terminal; alias/domain promotion check' },
  { index: 8, id: 'message-execution', label: 'Message Preparation / Execution', supported: true,
    probe: 'PARTIAL, channel-dependent: channel Sent/outbox query (email: Gmail Sent search; other channels: provider log)' },
  { index: 9, id: 'campaign-publication', label: 'Campaign Publication', supported: true,
    probe: 'post like-state re-check; post-pass verify record' },
  { index: 10, id: 'financial-action', label: 'Financial Action', supported: true,
    probe: 'retrieve payment_intent/charge by id; money-moved is provider-authoritative' },
]);

const EFFECT_CLASS_IDS = new Set(EFFECT_CLASSES.map((c) => c.id));

// Effect-record states for this derivation. effect_unknown and effect_hold
// reuse the exact outcomes.js EFFECT_STATE strings (one vocabulary); 
// effect_effected is scoped to this derivation: the effect is proven to have
// occurred. It is terminal for promotion: an EFFECTED record can never be
// promoted to FAILED (a proven effect contradicts a failure verdict).
const EFFECT_RECORD_STATE = Object.freeze({
  UNKNOWN: EFFECT_STATE.UNKNOWN,   // 'effect_unknown'
  HELD: EFFECT_STATE.HOLD,         // 'effect_hold'
  EFFECTED: 'effect_effected',
});

function isEffectRecordState(v) {
  return v === EFFECT_RECORD_STATE.UNKNOWN
    || v === EFFECT_RECORD_STATE.HELD
    || v === EFFECT_RECORD_STATE.EFFECTED;
}

function effectClassById(id) {
  const c = EFFECT_CLASSES.find((x) => x.id === id);
  if (!c) throw new Error(`effect_ledger: unknown effect_class '${id}' (not one of the 10 surveyed classes)`);
  if (c.supported === false) throw new Error(`effect_ledger: effect_class '${id}' is explicitly marked unsupported; no evidence ref can be built`);
  return c;
}

/**
 * Deterministic effect id. Same (dispatch_key, attempt) -> same id, so a
 * replayed promotion derives the same record identity and is detected as a
 * replay instead of being appended twice. Timestamp-free inputs by design.
 */
function effectIdFor(dispatch_key, attempt) {
  if (typeof dispatch_key !== 'string' || dispatch_key.length === 0) {
    throw new Error('effectIdFor: dispatch_key must be a non-empty string');
  }
  const a = String(attempt);
  if (a.length === 0) throw new Error('effectIdFor: attempt required');
  const hex = crypto.createHash('sha256').update(`${dispatch_key}:${a}`, 'utf8').digest('hex').slice(0, 16);
  return `effect_${hex}`;
}

/**
 * Build one well-formed failure evidence ref for an effect class.
 * A ref cites WHERE the definitive failure was observed (probe output,
 * provider record id, query result), not the claim itself.
 */
function evidenceRef(effect_class, ref, kind) {
  const c = effectClassById(effect_class);
  if (typeof ref !== 'string' || ref.length === 0) {
    throw new Error('evidenceRef: ref must be a non-empty string citing the observed evidence');
  }
  return {
    effect_class: c.id,
    evidence_kind: kind || 'probe',
    ref,
    observed_at: new Date().toISOString(),
  };
}

/**
 * Typed definitive-failure evidence. ALL of these must hold for promotion:
 *  - ev.definitive === true (explicit typed claim, not inferred)
 *  - ev.effect_class is a known, supported surveyed class
 *  - ev.refs is a non-empty array of well-formed refs for that class
 *  - ev.observed_by names who/what observed the failure
 * Anything weaker (definitive false, missing refs, unknown class) is NOT
 * definitive and can never promote.
 */
function isDefinitiveFailure(ev) {
  if (!ev || typeof ev !== 'object') return false;
  if (ev.definitive !== true) return false;
  if (typeof ev.effect_class !== 'string' || !EFFECT_CLASS_IDS.has(ev.effect_class)) return false;
  const cls = EFFECT_CLASSES.find((c) => c.id === ev.effect_class);
  if (!cls || cls.supported === false) return false;
  if (!Array.isArray(ev.refs) || ev.refs.length === 0) return false;
  for (const r of ev.refs) {
    if (!r || typeof r !== 'object') return false;
    if (r.effect_class !== ev.effect_class) return false;
    if (typeof r.ref !== 'string' || r.ref.length === 0) return false;
  }
  if (typeof ev.observed_by !== 'string' || ev.observed_by.length === 0) return false;
  return true;
}

/**
 * Create an effect record for one (dispatch_key, attempt). The caller owns
 * the ledger array; this returns the record. Pure: no mutation, no I/O.
 */
function recordEffect({ dispatch_key, attempt, effect_state }) {
  if (!isEffectRecordState(effect_state)) {
    throw new Error(`recordEffect: refusing to record effect_state '${effect_state}' (must be effect_unknown | effect_hold | effect_effected)`);
  }
  const id = effectIdFor(dispatch_key, attempt);
  return {
    kind: 'effect_record',
    effect_id: id,
    dispatch_key,
    attempt: String(attempt),
    effect_state,
    failure_evidence_refs: [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Append a record to the caller's ledger. Returns a NEW array; the input
 * ledger is never mutated (append-only discipline).
 */
function appendRecord(ledger, record) {
  const l = Array.isArray(ledger) ? ledger : [];
  return [...l, record];
}

function findPromotion(ledger, effect_id) {
  if (!Array.isArray(ledger)) return null;
  return ledger.find((r) => r && r.kind === 'effect_promotion' && r.effect_id === effect_id) || null;
}

/**
 * Promote an effect_unknown / effect_hold record to FAILED.
 *
 * The ONLY promotion arrow this module allows. Requires definitive failure
 * evidence (typed, refs cited). Without it, returns { promoted: false } and
 * appends NOTHING: the outcome stays effect_unknown / effect_hold.
 *
 * Promotion appends a promotion record (history is never rewritten) and
 * derives the FAILED terminal outcome through the existing outcome path
 * (outcomes.js failedFromEffectPromotion -> terminalOutcome).
 *
 * Idempotent: replaying the same promotion (same dispatch_key + attempt)
 * derives the same effect_id, finds the existing promotion record, and
 * returns it without appending a duplicate.
 *
 * Pure with respect to inputs: neither `record` nor the input `ledger`
 * array is mutated. Returns { promoted, replay, ledger, promotion, outcome }.
 */
function promoteEffect(ledger, record, evidence, cause) {
  if (!record || typeof record !== 'object' || record.kind !== 'effect_record' || typeof record.effect_id !== 'string') {
    throw new Error('promoteEffect: record must be an effect record from recordEffect()');
  }
  if (record.effect_state !== EFFECT_RECORD_STATE.UNKNOWN && record.effect_state !== EFFECT_RECORD_STATE.HELD) {
    throw new Error(`promoteEffect: refusing to promote a record whose effect_state is '${record.effect_state}' (only effect_unknown / effect_hold may be promoted to FAILED; effect_effected contradicts a failure verdict)`);
  }
  const derived = effectIdFor(record.dispatch_key, record.attempt);
  if (derived !== record.effect_id) {
    throw new Error(`promoteEffect: record integrity failure: effect_id '${record.effect_id}' does not derive from (dispatch_key, attempt)`);
  }
  if (!isDefinitiveFailure(evidence)) {
    // FINISH doctrine: without definitive evidence there is no promotion.
    // The outcome stays effect_unknown / effect_hold and the caller owns
    // reconcile-vs-retry. A bare post-effect throw is never promoted to
    // FAILED: the return points the caller at the HOLD path explicitly.
    return {
      promoted: false, replay: false,
      ledger: Array.isArray(ledger) ? ledger : [],
      record, promotion: null, outcome: null,
      reason: 'evidence_not_definitive',
      next: 'effect_hold',
      reconcileOwnedBy: 'caller',
    };
  }
  const existing = findPromotion(ledger, record.effect_id);
  if (existing) {
    // Replay: same promotion derived again. Return the existing record and
    // the same derived outcome; do NOT append a duplicate.
    return {
      promoted: true, replay: true,
      ledger: Array.isArray(ledger) ? ledger : [],
      record, promotion: existing,
      outcome: failedOutcomeFromPromotion(record, existing),
    };
  }
  const promotion = {
    kind: 'effect_promotion',
    effect_id: record.effect_id,
    dispatch_key: record.dispatch_key,
    attempt: record.attempt,
    from_effect_state: record.effect_state,
    to_outcome: 'failed',
    evidence_class: evidence.effect_class,
    failure_evidence_refs: evidence.refs.map((r) => ({ ...r })),
    failure: typeof evidence.failure === 'string' ? evidence.failure : 'definitive_failure',
    observed_by: evidence.observed_by,
    cause: typeof cause === 'string' && cause.length > 0 ? cause : 'definitive failure evidence presented post-effect',
    promoted_at: new Date().toISOString(),
  };
  const newLedger = appendRecord(ledger, promotion);
  return {
    promoted: true, replay: false,
    ledger: newLedger, record, promotion,
    outcome: failedOutcomeFromPromotion(record, promotion),
  };
}

// The FAILED terminal outcome is derived through the existing outcome path
// in outcomes.js (failedFromEffectPromotion -> terminalOutcome): this module
// presents the evidence, outcomes.js owns the verdict. Not a new authority.
const { failedFromEffectPromotion } = require('./outcomes.js');
function failedOutcomeFromPromotion(record, promotion) {
  return failedFromEffectPromotion(record, promotion);
}

module.exports = {
  EFFECT_CLASSES,
  EFFECT_RECORD_STATE,
  effectIdFor,
  effectClassById,
  evidenceRef,
  isDefinitiveFailure,
  recordEffect,
  appendRecord,
  promoteEffect,
};
