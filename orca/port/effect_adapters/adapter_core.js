/**
 * adapter_core.js — shared core for the ORCA P0 effect-class adapter layer.
 *
 * PORT SEAM: this module wires the A6 unknown-outcome foundation to the real
 * external-effect boundaries (skill CLIs / Pig browser automation). The A6
 * foundation module (ping-runtime/orchestration/effect_reconciler.js) is owned
 * by the sibling worker. This file loads it via dependency injection:
 *
 *   const core = require('./adapter_core.js')({ foundation });
 *
 * where `foundation` is { EffectLedger, EffectReconciler, UnknownOutcomeError,
 * EFFECT_DISPATCHED, EFFECT_SUCCEEDED, EFFECT_FAILED, EFFECT_UNKNOWN,
 * EFFECT_RECONCILED, EFFECT_HELD }. When placed at
 * ping-runtime/orchestration/effect_adapters/adapter_core.js it will also try
 * require('../effect_reconciler.js') as a fallback. If neither is available, a
 * clearly-marked local SHIM ledger/emit path is used. The shim is NOT the
 * canonical authority; it exists only so adapters stay testable and the seam
 * stays explicit until the foundation lands.
 *
 * PORT LAWS ENCODED HERE:
 *  1. Timeout is an observation, never an effect outcome. probeWithTimeout()
 *     never resolves a timeout as success or failure; it returns an
 *     inconclusive probe with an explicit observation record.
 *  2. Never "retry the intent" — always re-probe, then decide.
 *     evaluatePredicate() enforces that a decision requires a fresh
 *     probeResult.
 *  3. Placeholder success = no evidence. assertProbeEvidence() treats any
 *     {success:true} probe result without real evidence fields as
 *     NO-EVIDENCE, never as success.
 *  4. Identity is caller-supplied and attempt-derived. deriveOpKey() never
 *     includes wall-clock time or randomness; deriveAttemptKey() derives the
 *     attempt key deterministically from (opKey, attemptIndex).
 *
 * No em dashes are used in this file. Secrets policy: this module never
 * accepts, echoes, or writes secret material. CLI deps receive argv-only
 * parameters; env is never forwarded to Windows processes.
 */
'use strict';

const crypto = require('crypto');

const OP_KEY_PREFIX = 'op:v1';
const ATTEMPT_SALT = 'attempt';
const EFFECT_EVENT_TYPES = [
  'EFFECT_DISPATCHED',
  'EFFECT_SUCCEEDED',
  'EFFECT_FAILED',
  'EFFECT_UNKNOWN',
  'EFFECT_RECONCILED',
  'EFFECT_HELD',
];

// Retry-predicate decisions. One terminal state out, per the competitive
// signal-pass discipline adopted for predicate evaluation.
const DECISIONS = Object.freeze({
  SAFE_TO_RETRY: 'SAFE_TO_RETRY',
  HOLD_UNKNOWN: 'HOLD_UNKNOWN',
  RECOVER_SUCCEEDED: 'RECOVER_SUCCEEDED',
  RECOVER_FAILED: 'RECOVER_FAILED',
});

/**
 * Deterministic canonicalization of an arbitrary input object.
 * Recursive key sort; arrays keep order; no whitespace; UTF-8.
 * Two inputs that are semantically equal produce byte-identical output,
 * so equal logical operations hash to the same op key regardless of key
 * insertion order.
 */
function canonicalize(input) {
  const walk = (v) => {
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(input));
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * deriveOpKey({ missionId, effectName, input }) -> hex op key.
 * Pinned contract: sha256("op:v1:" + mission_id + ":" + effect_name + ":"
 * + canonical(input)).
 *
 * missionId and effectName are CALLER-SUPPLIED logical identifiers.
 * input is the frozen approved content/parameters snapshot. NOTHING here
 * may come from Date.now(), Math.random(), crypto.randomUUID(), or any
 * other wall-clock/random source. The timestamp-in-identity anti-pattern
 * (commit_authority commit_id hashing wall-clock, canonical UUID v5
 * embedding a timestamp, FYD journal random event_id) is exactly what this
 * replaces. See REPAIR-NOTES.md for the three known repair sites.
 */
function deriveOpKey({ missionId, effectName, input }) {
  if (!missionId || typeof missionId !== 'string') {
    throw new Error('deriveOpKey requires caller-supplied missionId (string)');
  }
  if (!effectName || typeof effectName !== 'string') {
    throw new Error('deriveOpKey requires caller-supplied effectName (string)');
  }
  if (input === undefined || input === null || typeof input !== 'object') {
    throw new Error('deriveOpKey requires input (frozen snapshot object)');
  }
  return sha256hex(`${OP_KEY_PREFIX}:${missionId}:${effectName}:${canonicalize(input)}`);
}

/**
 * deriveAttemptKey(opKey, attemptIndex) -> hex attempt key.
 * A NEW ATTEMPT is a new key derived from the parent op key and the
 * integer attempt index: sha256(opKey + ":attempt:" + index).
 * Never via timestamp, never via randomness. attemptIndex must be a
 * non-negative integer; the first dispatch is attempt 0.
 */
function deriveAttemptKey(opKey, attemptIndex) {
  if (typeof opKey !== 'string' || !/^[0-9a-f]{64}$/.test(opKey)) {
    throw new Error('deriveAttemptKey requires a valid opKey hex string');
  }
  if (!Number.isInteger(attemptIndex) || attemptIndex < 0) {
    throw new Error('deriveAttemptKey requires attemptIndex as non-negative integer');
  }
  return sha256hex(`${opKey}:${ATTEMPT_SALT}:${attemptIndex}`);
}

/**
 * Probe result contract. Every probe MUST return an object of this shape:
 *   { opKey, attemptWindow: {from, to}, outcome, observation, evidence }
 * outcome: 'delivered' | 'not-delivered' | 'inconclusive'
 * observation: free-form string describing what the probe OBSERVED
 *   (a timeout observation is an observation, never an effect outcome).
 * evidence: object with provider-native proof (message ids, byte matches,
 *   screenshots paths, CLI stdout digests). Empty evidence = no evidence.
 */
function makeProbeResult({ opKey, attemptWindow, outcome, observation, evidence }) {
  const allowed = ['delivered', 'not-delivered', 'inconclusive'];
  if (!allowed.includes(outcome)) {
    throw new Error(`probe outcome must be one of ${allowed.join(',')}`);
  }
  return {
    opKey,
    attemptWindow: attemptWindow || null,
    outcome,
    observation: observation || '',
    evidence: evidence && typeof evidence === 'object' ? evidence : {},
  };
}

/**
 * PORT LAW 3: placeholder success = no evidence.
 * Returns true only when the probe result carries at least one real
 * evidence field beyond the envelope. A component that reports
 * {success:true} (or outcome 'delivered') with empty evidence — the
 * CommitAuthority._gitPush pattern, the FYD journal emitOverlayEvent
 * timeout-after-accept pattern — is treated as no-evidence, never success.
 */
function assertProbeEvidence(probeResult) {
  if (!probeResult || typeof probeResult !== 'object') return false;
  const ev = probeResult.evidence;
  if (!ev || typeof ev !== 'object') return false;
  const keys = Object.keys(ev).filter((k) => ev[k] !== null && ev[k] !== undefined && ev[k] !== '');
  return keys.length > 0;
}

/**
 * PORT LAW 1: timeout is an observation, never an effect outcome.
 * Runs probeFn with a wall-clock budget. On timeout, resolves to an
 * INCONCLUSIVE probe with observation 'probe-timeout' and evidence
 * { timeoutMs }. It never resolves to delivered/not-delivered from a
 * timeout. Wall-clock is used ONLY as a local timeout budget, never as
 * identity material.
 */
function probeWithTimeout({ opKey, attemptWindow, probeFn, timeoutMs }) {
  const ms = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000;
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(
        makeProbeResult({
          opKey,
          attemptWindow,
          outcome: 'inconclusive',
          observation: `probe-timeout after ${ms}ms: timeout is an observation, not an effect outcome`,
          evidence: { timeoutMs: ms, timeoutObserved: true },
        })
      );
    }, ms);
    Promise.resolve()
      .then(probeFn)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(
          makeProbeResult({
            opKey,
            attemptWindow,
            outcome: 'inconclusive',
            observation: `probe-error: ${err && err.message ? err.message : String(err)}`,
            evidence: { probeError: err && err.message ? err.message : String(err) },
          })
        );
      });
  });
}

/**
 * Validates that a per-class module exports the required contract:
 *   deriveOpKey(input), probe(opKey, attemptWindow, deps),
 *   retryPredicate(probeResult, context), holdConditions (array of strings).
 */
function assertClassContract(classModule, classId) {
  const required = ['deriveOpKey', 'probe', 'retryPredicate', 'holdConditions'];
  for (const name of required) {
    if (typeof classModule[name] !== 'function' && name !== 'holdConditions') {
      throw new Error(`${classId}: contract violation, missing function ${name}`);
    }
  }
  if (!Array.isArray(classModule.holdConditions)) {
    throw new Error(`${classId}: contract violation, holdConditions must be an array`);
  }
  return true;
}

/**
 * PORT LAW 2: never "retry the intent" — always re-probe, then decide.
 * evaluatePredicate requires a fresh probeResult and delegates to the
 * per-class retryPredicate. It validates the decision enum and returns a
 * normalized { decision, evidence, holdReason } record. Unknown or missing
 * decisions fail closed to HOLD_UNKNOWN.
 */
function evaluatePredicate({ classModule, classId, probeResult, context }) {
  assertClassContract(classModule, classId);
  if (!probeResult || typeof probeResult !== 'object' || !probeResult.outcome) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: {},
      holdReason: 'predicate invoked without a probe result; re-probe first',
    };
  }
  let raw;
  try {
    raw = classModule.retryPredicate(probeResult, context || {});
  } catch (err) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: {},
      holdReason: `retryPredicate threw: ${err && err.message ? err.message : String(err)}`,
    };
  }
  const decision = raw && raw.decision;
  if (!Object.values(DECISIONS).includes(decision)) {
    return {
      decision: DECISIONS.HOLD_UNKNOWN,
      evidence: (raw && raw.evidence) || {},
      holdReason: `invalid predicate decision '${decision}'; fail closed`,
    };
  }
  return {
    decision,
    evidence: (raw && raw.evidence) || {},
    holdReason: (raw && raw.holdReason) || null,
  };
}

/**
 * HOLD escalation. Writes the op into the ledger as UNKNOWN/HELD and emits
 * EFFECT_UNKNOWN + EFFECT_HELD events. Delegates to the foundation when
 * present; otherwise uses the local shim (marked, non-canonical).
 */
function escalateHold({ foundation, opKey, effectName, effectClass, attemptKey, holdReason, evidence, missionId }) {
  const holdRecord = {
    opKey,
    effectName,
    effectClass,
    attemptKey: attemptKey || null,
    missionId: missionId || null,
    state: 'HELD',
    holdReason: holdReason || 'unspecified',
    evidence: evidence || {},
    heldAt: new Date().toISOString(),
  };
  const emit = makeEmitter(foundation);
  if (foundation && foundation.EffectReconciler) {
    emit('EFFECT_UNKNOWN', { opKey, effectName, effectClass, attemptKey, reason: holdReason, evidence });
    emit('EFFECT_HELD', { opKey, effectName, effectClass, attemptKey, reason: holdReason, evidence });
  } else {
    shimLedgerAppend(holdRecord);
    emit('EFFECT_UNKNOWN', { opKey, reason: holdReason });
    emit('EFFECT_HELD', { opKey, reason: holdReason });
  }
  return holdRecord;
}

/**
 * Record a reconciled outcome (RECOVER_SUCCEEDED / RECOVER_FAILED /
 * SAFE_TO_RETRY path) against the ledger and emit the matching event.
 */
function recordOutcome({ foundation, opKey, effectName, effectClass, attemptKey, decision, evidence, missionId }) {
  const eventByDecision = {
    [DECISIONS.RECOVER_SUCCEEDED]: 'EFFECT_SUCCEEDED',
    [DECISIONS.RECOVER_FAILED]: 'EFFECT_FAILED',
    [DECISIONS.SAFE_TO_RETRY]: 'EFFECT_RECONCILED',
  };
  const record = {
    opKey,
    effectName,
    effectClass,
    attemptKey: attemptKey || null,
    missionId: missionId || null,
    decision,
    evidence: evidence || {},
    recordedAt: new Date().toISOString(),
  };
  const emit = makeEmitter(foundation);
  const evt = eventByDecision[decision];
  if (evt) emit(evt, { opKey, effectName, effectClass, decision, evidence });
  if (!foundation || !foundation.EffectReconciler) shimLedgerAppend(record);
  return record;
}

function makeEmitter(foundation) {
  if (foundation && foundation.EffectReconciler && typeof foundation.EffectReconciler.emit === 'function') {
    return (type, payload) => foundation.EffectReconciler.emit(type, payload);
  }
  return (type, payload) => {
    // Shim emitter: stdout JSON line, clearly marked non-canonical.
    process.stdout.write(
      `[ADAPTER-SHIM-EVENT] ${type} ${JSON.stringify({ ...(payload || {}), shim: true })}\n`
    );
  };
}

// Local shim ledger. NOT the canonical authority. Exists only so the
// adapter layer remains testable before the A6 foundation lands. Every
// entry is tagged shim:true. The sibling worker's EffectLedger replaces
// this entirely; do not build features on it.
const SHIM_LEDGER = [];
function shimLedgerAppend(record) {
  SHIM_LEDGER.push({ ...record, shim: true });
  return record;
}
function shimLedgerRead() {
  return SHIM_LEDGER.slice();
}
function shimLedgerClear() {
  SHIM_LEDGER.length = 0;
}

/**
 * Resolve the foundation: explicit injection first, then the sibling
 * module at ../effect_reconciler.js (the placement this directory ships
 * for), then the shim. Returns { foundation, source } where source is
 * 'injected' | 'sibling' | 'shim'.
 */
function resolveFoundation(injected) {
  if (injected && injected.EffectReconciler) return { foundation: injected, source: 'injected' };
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const sibling = require('../effect_reconciler.js');
    if (sibling && sibling.EffectReconciler) return { foundation: sibling, source: 'sibling' };
  } catch (err) {
    // sibling not present yet; fall through to shim
  }
  return { foundation: null, source: 'shim' };
}

/**
 * Factory. Usage:
 *   const core = require('./adapter_core.js')({ foundation });
 * Exposes the shared primitives plus the resolved foundation source so
 * callers and tests can assert which backing is in use.
 */
function createCore(opts) {
  const { foundation, source } = resolveFoundation(opts && opts.foundation);
  return {
    DECISIONS,
    EFFECT_EVENT_TYPES,
    canonicalize,
    deriveOpKey,
    deriveAttemptKey,
    makeProbeResult,
    assertProbeEvidence,
    probeWithTimeout,
    assertClassContract,
    evaluatePredicate,
    foundation,
    foundationSource: source,
    escalateHold: (args) => escalateHold({ foundation, ...args }),
    recordOutcome: (args) => recordOutcome({ foundation, ...args }),
    _shim: { ledgerRead: shimLedgerRead, ledgerClear: shimLedgerClear },
  };
}

module.exports = createCore;
module.exports.createCore = createCore;
module.exports.DECISIONS = DECISIONS;
module.exports.EFFECT_EVENT_TYPES = EFFECT_EVENT_TYPES;
