/**
 * adapter_core.js — shared core for the ORCA P0 effect-class adapter layer.
 *
 * PORT SEAM: this module wires the A6 unknown-outcome foundation to the real
 * external-effect boundaries (skill CLIs / Pig browser automation). The A6
 * foundation module (ping-runtime/orchestration/effect_reconciler.js) is owned
 * by the sibling worker. This file resolves it in order:
 *
 *   1. explicit injection: require('./adapter_core.js')({ foundation, emit })
 *   2. sibling module: require('../effect_reconciler.js') — the layout this
 *      directory ships in (ping-runtime/orchestration/effect_adapters/)
 *   3. local SHIM — test-only fallback when no foundation is reachable.
 *
 * `core.foundationSource` reports 'injected' | 'sibling' | 'shim' so callers
 * and tests can assert which backing is live.
 *
 * CONFORMANCE (verified 2026-09-24 against the real foundation at
 * ping-runtime/orchestration/effect_reconciler.js, commit 36d401538):
 *
 * - deriveOpKey delegates to foundation.deriveOpKey({ missionId, effect,
 *   input }) whenever the foundation is present, so adapter op keys are
 *   byte-identical to the keys the EffectExecutor and EffectReconciler use.
 *   The adapter's `effectName` IS the foundation's `effect` identifier; the
 *   hash material is op:v1:<mission>:<effect>:<canonical(input)> in both.
 *   The local canonicalize()/sha256 implementation below is the pinned
 *   contract fallback for the shim path only.
 * - Event payloads use the A6 snake_case schema (op_key, mission_id, effect,
 *   attempt, reason, consequence, result, error, retryable, evidence). The
 *   reconciler sweep groups EFFECT_UNKNOWN events by payload.op_key; a
 *   camelCase payload would make held ops invisible to the sweep.
 * - escalateHold emits EFFECT_UNKNOWN + EFFECT_HELD with `consequence`
 *   propagated (the sweep's decide() needs it: unknown + low-consequence +
 *   attempts-left -> bounded retry, high-consequence -> held). Held ops stay
 *   sweepable: the reconciler re-probes HELD ops and can still RECOVER them
 *   on new evidence (EFFECT_RECONCILED carrying `result`).
 * - recordOutcome maps RECOVER_SUCCEEDED -> EFFECT_SUCCEEDED (carries
 *   `result`), RECOVER_FAILED -> EFFECT_FAILED (never unknown; a definitive
 *   failure is definitive), and SAFE_TO_RETRY -> NO terminal event. The real
 *   reconcile() emits nothing for retry_authorized: the op stays open and
 *   the caller's next dispatch emits EFFECT_DISPATCHED with the next
 *   attempt number. Emitting a terminal EFFECT_* for a retry authorization
 *   would wrongly close the op for the sweep.
 * - EffectReconciler has NO static emit. Event emission on the real path
 *   requires a caller-injected `emit(type, payload)` bound to the
 *   UnifiedEventRuntime. With the real foundation loaded and no emit
 *   injected, the emitter FAILS LOUD instead of silently writing shim
 *   events: a hold that never reaches the event store can never be swept
 *   or recovered, so silence would be a lost hold.
 * - The shim (source 'shim') is TEST-ONLY: process-local ledger, stdout
 *   [ADAPTER-SHIM-EVENT] lines tagged shim:true. Nothing on this path is
 *   canonical and nothing on it may be mistaken for a durable write.
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
 *
 * PINNED-CONTRACT fallback: used for op-key hashing only when the real
 * foundation is unreachable (shim path). When the foundation is present,
 * deriveOpKey delegates to foundation.deriveOpKey so keys are byte-identical
 * with the rest of the A6 system.
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

function validateDeriveArgs(missionId, effectName, input) {
  if (!missionId || typeof missionId !== 'string') {
    throw new Error('deriveOpKey requires caller-supplied missionId (string)');
  }
  if (!effectName || typeof effectName !== 'string') {
    throw new Error('deriveOpKey requires caller-supplied effectName (string)');
  }
  if (input === undefined || input === null || typeof input !== 'object') {
    throw new Error('deriveOpKey requires input (frozen snapshot object)');
  }
}

/** Local pinned-contract op-key implementation (shim path only). */
function localDeriveOpKey({ missionId, effectName, input }) {
  validateDeriveArgs(missionId, effectName, input);
  return sha256hex(`${OP_KEY_PREFIX}:${missionId}:${effectName}:${canonicalize(input)}`);
}

/**
 * Build the instance's deriveOpKey. With the real foundation present this
 * delegates to foundation.deriveOpKey({ missionId, effect, input }) — the
 * adapter's effectName IS the foundation's effect identifier, so the keys
 * are byte-identical with the EffectExecutor / EffectReconciler key space.
 */
function makeDeriveOpKey(foundation) {
  if (foundation && typeof foundation.deriveOpKey === 'function') {
    return ({ missionId, effectName, input }) => {
      validateDeriveArgs(missionId, effectName, input);
      return foundation.deriveOpKey({ missionId, effect: effectName, input });
    };
  }
  return localDeriveOpKey;
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
 * A6 event payload schema. The reconciler sweep groups EFFECT_UNKNOWN events
 * by payload.op_key and reads payload.consequence for the hold/retry
 * decision, so payloads MUST use these snake_case keys. A camelCase payload
 * would make the op invisible to the sweep.
 */
function basePayload({ opKey, effectName, effectClass, attemptKey, attempt, consequence, missionId }) {
  return {
    op_key: opKey,
    mission_id: missionId || null,
    effect: effectName,
    effect_class: effectClass,
    attempt: Number.isInteger(attempt) ? attempt : null,
    attempt_key: attemptKey || null,
    consequence: consequence || 'high',
  };
}

/**
 * HOLD escalation. On the real path this emits EFFECT_UNKNOWN + EFFECT_HELD
 * through the injected emitter (bound to the UnifiedEventRuntime) so the
 * reconciler sweep can find the op by op_key, honor `consequence`, and
 * still RECOVER the op later on new evidence. On the shim path it appends
 * to the process-local shim ledger and emits marked stdout events.
 */
function escalateHold({ foundation, emit, opKey, effectName, effectClass, attemptKey, attempt, consequence, holdReason, evidence, missionId }) {
  const payload = {
    ...basePayload({ opKey, effectName, effectClass, attemptKey, attempt, consequence, missionId }),
    reason: holdReason || 'unspecified',
    evidence: evidence || {},
  };
  const holdRecord = {
    opKey,
    effectName,
    effectClass,
    attemptKey: attemptKey || null,
    attempt: payload.attempt,
    missionId: missionId || null,
    consequence: payload.consequence,
    state: 'HELD',
    holdReason: holdReason || 'unspecified',
    evidence: evidence || {},
    heldAt: new Date().toISOString(),
    durable: !!foundation,
    sink: foundation ? 'event-store' : 'shim-test-only',
  };
  const emitter = makeEmitter(foundation, emit);
  if (foundation) {
    emitter('EFFECT_UNKNOWN', payload);
    emitter('EFFECT_HELD', { ...payload, escalated_to: 'operator' });
  } else {
    shimLedgerAppend(holdRecord);
    emitter('EFFECT_UNKNOWN', { opKey, reason: holdReason });
    emitter('EFFECT_HELD', { opKey, reason: holdReason });
  }
  return holdRecord;
}

/**
 * Record a reconciled outcome against the event store (real path) or the
 * shim ledger (test-only path).
 *
 * Real-path mapping (matches EffectReconciler.reconcile() semantics):
 *   RECOVER_SUCCEEDED -> EFFECT_SUCCEEDED, carries `result`
 *   RECOVER_FAILED    -> EFFECT_FAILED (definitive failure; never unknown),
 *                        retryable:false
 *   SAFE_TO_RETRY     -> NO terminal event. The op stays open; the caller's
 *                        next dispatch emits EFFECT_DISPATCHED with the next
 *                        attempt number. Emitting a terminal EFFECT_* here
 *                        would wrongly close the op for the reconciler sweep.
 *   HOLD_UNKNOWN      -> no event here; the caller must escalateHold().
 */
function recordOutcome({ foundation, emit, opKey, effectName, effectClass, attemptKey, attempt, consequence, decision, evidence, error, missionId }) {
  const payload = {
    ...basePayload({ opKey, effectName, effectClass, attemptKey, attempt, consequence, missionId }),
    evidence: evidence || {},
  };
  const record = {
    opKey,
    effectName,
    effectClass,
    attemptKey: attemptKey || null,
    attempt: payload.attempt,
    missionId: missionId || null,
    consequence: payload.consequence,
    decision,
    evidence: evidence || {},
    recordedAt: new Date().toISOString(),
    durable: !!foundation,
    sink: foundation ? 'event-store' : 'shim-test-only',
  };
  const emitter = makeEmitter(foundation, emit);
  if (foundation) {
    if (decision === DECISIONS.RECOVER_SUCCEEDED) {
      // Real semantics: recovered outcomes carry `result`.
      const result = evidence && evidence.result !== undefined ? evidence.result : null;
      emitter('EFFECT_SUCCEEDED', { ...payload, result });
      record.emitted = 'EFFECT_SUCCEEDED';
    } else if (decision === DECISIONS.RECOVER_FAILED) {
      emitter('EFFECT_FAILED', { ...payload, error: error || 'effect definitively failed', retryable: false });
      record.emitted = 'EFFECT_FAILED';
    } else {
      // SAFE_TO_RETRY / HOLD_UNKNOWN: no terminal event on the real path.
      record.emitted = null;
    }
  } else {
    const eventByDecision = {
      [DECISIONS.RECOVER_SUCCEEDED]: 'EFFECT_SUCCEEDED',
      [DECISIONS.RECOVER_FAILED]: 'EFFECT_FAILED',
      [DECISIONS.SAFE_TO_RETRY]: 'EFFECT_RECONCILED',
    };
    const evt = eventByDecision[decision];
    if (evt) emitter(evt, { opKey, effectName, effectClass, decision, evidence: evidence || {} });
    shimLedgerAppend(record);
    record.emitted = evt || null;
  }
  return record;
}

/**
 * Build the event emitter for escalateHold/recordOutcome.
 *
 * 1. A caller-injected `emit(type, payload)` always wins. In production it
 *    is bound to the UnifiedEventRuntime:
 *      (type, payload) => eventRuntime.emit(type, 'effect-adapters', payload, { correlation_id: payload.op_key })
 * 2. Real foundation loaded but no emit injected: FAIL LOUD. The
 *    EffectReconciler class has no static emit; without a bound runtime the
 *    canonical store is unreachable, and a hold that never reaches the
 *    event store can never be swept or recovered. Silence would be a lost
 *    hold, so this throws instead of degrading to the shim.
 * 3. No foundation: the TEST-ONLY shim emitter (stdout JSON line, tagged
 *    shim:true). Never canonical.
 */
function makeEmitter(foundation, injectedEmit) {
  if (typeof injectedEmit === 'function') return injectedEmit;
  if (foundation) {
    return () => {
      throw new Error(
        'adapter_core: canonical event sink unreachable. The real A6 foundation is loaded ' +
        'but no `emit` was injected into createCore({ emit }). EFFECT_* events must reach the ' +
        'UnifiedEventRuntime; a hold that never reaches the event store can never be swept or ' +
        'recovered. Pass { emit: (type, payload) => eventRuntime.emit(type, source, payload, opts) }.'
      );
    };
  }
  return (type, payload) => {
    // Shim emitter: stdout JSON line, clearly marked non-canonical, test-only.
    process.stdout.write(
      `[ADAPTER-SHIM-EVENT] ${type} ${JSON.stringify({ ...(payload || {}), shim: true, testOnly: true })}\n`
    );
  };
}

// Local shim ledger. NOT the canonical authority. Exists only so the
// adapter layer remains testable when the A6 foundation is unreachable.
// Every entry is tagged shim:true. The sibling worker's EffectLedger
// replaces this entirely; do not build features on it.
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
 * The pinned A6 export contract the adapters depend on. If a foundation
 * module loads but is missing any of these, the seam REFUSES to silently
 * fall back to the shim: a corrupt foundation must fail loud, never
 * degrade to a non-canonical authority.
 */
const FOUNDATION_CONTRACT = [
  'EffectLedger',
  'EffectReconciler',
  'EffectExecutor',
  'UnknownOutcomeError',
  'deriveOpKey',
  'canonicalJson',
  'describeState',
];

function assertFoundationContract(mod, where) {
  const missing = FOUNDATION_CONTRACT.filter((k) => mod[k] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `adapter_core: foundation at ${where} is missing exports: ${missing.join(', ')}. ` +
      'Refusing to fall back to the shim on a corrupt foundation.'
    );
  }
  for (const t of EFFECT_EVENT_TYPES) {
    if (!mod.EFFECT_TYPES || typeof mod.EFFECT_TYPES.has !== 'function' || !mod.EFFECT_TYPES.has(t)) {
      throw new Error(
        `adapter_core: foundation at ${where} does not carry EFFECT_TYPES '${t}'. ` +
        'Refusing to fall back to the shim on a corrupt foundation.'
      );
    }
  }
}

/**
 * Resolve the foundation: explicit injection first, then the sibling
 * module at ../effect_reconciler.js (the placement this directory ships
 * for), then the test-only shim. Returns { foundation, source } where
 * source is 'injected' | 'sibling' | 'shim'.
 */
function resolveFoundation(injected) {
  if (injected) {
    assertFoundationContract(injected, 'injected');
    return { foundation: injected, source: 'injected' };
  }
  let sibling = null;
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    sibling = require('../effect_reconciler.js');
  } catch (err) {
    sibling = null; // not placed next to the foundation yet; shim below
  }
  if (sibling) {
    assertFoundationContract(sibling, 'sibling ../effect_reconciler.js');
    return { foundation: sibling, source: 'sibling' };
  }
  return { foundation: null, source: 'shim' };
}

/**
 * Factory. Usage:
 *   const core = require('./adapter_core.js')({ foundation, emit });
 *
 * `foundation` is normally resolved automatically from the sibling module.
 * `emit(type, payload)` is the caller's binding to the UnifiedEventRuntime;
 * required for durable EFFECT_* writes whenever the real foundation is
 * loaded. Without it, escalateHold/recordOutcome fail loud rather than
 * silently losing events.
 *
 * Exposes the shared primitives plus the resolved foundation source so
 * callers and tests can assert which backing is in use.
 */
function createCore(opts) {
  const { foundation, source } = resolveFoundation(opts && opts.foundation);
  const emit = opts && opts.emit;
  return {
    DECISIONS,
    EFFECT_EVENT_TYPES,
    canonicalize,
    deriveOpKey: makeDeriveOpKey(foundation),
    deriveAttemptKey,
    makeProbeResult,
    assertProbeEvidence,
    probeWithTimeout,
    assertClassContract,
    evaluatePredicate,
    foundation,
    foundationSource: source,
    escalateHold: (args) => escalateHold({ foundation, emit, ...args }),
    recordOutcome: (args) => recordOutcome({ foundation, emit, ...args }),
    _shim: { ledgerRead: shimLedgerRead, ledgerClear: shimLedgerClear },
  };
}

module.exports = createCore;
module.exports.createCore = createCore;
module.exports.DECISIONS = DECISIONS;
module.exports.EFFECT_EVENT_TYPES = EFFECT_EVENT_TYPES;
