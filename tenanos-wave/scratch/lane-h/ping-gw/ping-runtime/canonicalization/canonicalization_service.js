/**
 * Canonicalization Service — PING Canonical Boundary v1
 *
 * The Canonicalization Boundary law: every observation, command, artifact,
 * decision, memory, plan, and external event MUST cross this boundary before
 * it exists. "If it wasn't canonicalized, it doesn't exist."
 *
 * This is a THIN FAÇADE over the two existing primitives — it builds no new
 * subsystem:
 *   1. createCanonicalObject()  (gateway/canonical_object.js — single envelope)
 *   2. UnifiedEventRuntime.emit (ping-runtime/events — single event spine)
 *
 * Responsibilities (nothing more):
 *   - resolve the namespace under the binding rule before persistence
 *     (core:: / tenant::); caller-supplied overrides are UNTRUSTED material
 *     and are honored only when the source is bound to them
 *   - derive a deterministic, timestamp-stripped logical identity
 *   - wrap the payload in the canonical envelope (schema_version /
 *     constitution_version / canonical_version already carried by the envelope)
 *   - emit through the event runtime with namespace + logical_id so retries
 *     are idempotent (same logical event → same event_id)
 *   - attach confidence (< 1 for observations) and evidence to the envelope
 *
 * The REST route (POST /ingest) and every producer (emitters, workers,
 * capture adapters) are thin adapters over this service.
 */

const { createCanonicalObject, verifyCanonicalObject } = require('./canonical_object');
const { createNamespaceBinder, NAMESPACE_RE } = require('./namespace_binding');

const CANONICAL_VERSION = '1.0.0';
const DEFAULT_NAMESPACE = 'core::owner';

// Volatile fields are stripped when deriving logical identity so that two
// emissions of the same logical event hash identically (no Date.now()).
const VOLATILE_FIELDS = [
  'timestamp', 'created_at', 'updated_at', 'paid_at', 'accepted_at',
  'completed_at', 'occurred_at', 'received_at', 'sent_at', 'started_at',
  'ended_at', 'recorded_at', 'processed_at',
];

class CanonicalizationService {
  /**
   * @param {object} options
   * @param {object} options.eventRuntime — UnifiedEventRuntime instance
   * @param {object} [options.namespaces] — source → namespace map (e.g. { 'review-authority': 'tenant::hpp' }).
   *   Operator-registered and TRUSTED: these become the source→namespace
   *   bindings. Never caller-set.
   * @param {string} [options.defaultNamespace] — fallback namespace (default 'core::owner')
   */
  constructor(options = {}) {
    this._eventRuntime = options.eventRuntime || null;
    this._namespaces = options.namespaces || {};
    this._defaultNamespace = options.defaultNamespace || DEFAULT_NAMESPACE;
    // The binder is the single authority for the allow/deny decision on
    // explicit overrides. Bindings come from the operator map above.
    this._binder = createNamespaceBinder({
      bindings: this._namespaces,
      defaultNamespace: this._defaultNamespace,
    });
  }

  /**
   * Validate a trusted namespace value (operator config / resolved default).
   */
  _checkedNamespace(namespace) {
    if (!NAMESPACE_RE.test(namespace)) {
      throw new Error(`Invalid namespace: '${namespace}' (must be core::<name> or tenant::<id>)`);
    }
    return namespace;
  }

  /**
   * Resolve the namespace for a source.
   *
   * Binding rule (P1 tenant-spoof fix): an explicit `requested` namespace is
   * UNTRUSTED request material. It is honored ONLY when the source is bound
   * to it (operator-registered binding). An unbound override is NEVER
   * honored: trusted routing (per-source map, then server default) resolves
   * the context instead. Malformed namespaces still throw.
   */
  resolveNamespace(source, requested) {
    const trusted = this._namespaces[source] || this._defaultNamespace;
    if (!requested) {
      return this._checkedNamespace(trusted);
    }
    if (!NAMESPACE_RE.test(requested)) {
      throw new Error(`Invalid namespace: '${requested}' (must be core::<name> or tenant::<id>)`);
    }
    const decision = this._binder.authorize(source, requested);
    if (decision.authorized) {
      return decision.namespace;
    }
    // Unbound override: ignore it in favor of trusted routing.
    return this._checkedNamespace(trusted);
  }

  /**
   * Authorize a producer's namespace claim at the boundary (audit §7 #1).
   * Delegates the allow/deny decision to the namespace binder: an explicit
   * override the source is not bound to is reported unauthorized (never
   * throws). This is the guard decision the boundary route uses before
   * canonicalizing; resolution + validation still have exactly one owner.
   *
   * @param {string} source — producing source/authority ID
   * @param {string} [requested] — explicit namespace override (optional)
   * @returns {{authorized: true, namespace: string} | {authorized: false, reason: string}}
   */
  authorizeNamespace(source, requested) {
    try {
      if (!requested) {
        const trusted = this._namespaces[source] || this._defaultNamespace;
        return { authorized: true, namespace: this._checkedNamespace(trusted) };
      }
      const decision = this._binder.authorize(source, requested);
      if (!decision.authorized) {
        return { authorized: false, reason: decision.reason };
      }
      return { authorized: true, namespace: decision.namespace };
    } catch (err) {
      return { authorized: false, reason: err.message };
    }
  }

  /**
   * Derive a deterministic logical identity, stripping volatile timestamp
   * fields from the payload so retries never produce duplicate IDs.
   */
  _logicalIdentity(payload, logicalId) {
    if (logicalId) return logicalId;
    const stable = { ...payload };
    for (const field of VOLATILE_FIELDS) delete stable[field];
    return JSON.stringify(stable);
  }

  /**
   * The canonical boundary. Every producer calls this.
   * @param {object} input
   * @param {string} input.source — producing source/authority ID
   * @param {string} input.eventType — event type (validated by EventValidator)
   * @param {object} input.payload — event data
   * @param {string} [input.namespace] — explicit namespace override (honored only if bound)
   * @param {string} [input.logicalId] — explicit logical identity (defaults to timestamp-stripped payload)
   * @param {number} [input.confidence] — default 0.5 (observations are not knowledge)
   * @param {array} [input.evidence] — evidence event IDs / references
   * @param {string} [input.lifecycleStage] — 'observation' | 'candidate' | 'knowledge' (default 'observation')
   * @param {object} [input.options] — passthrough to eventRuntime.emit (causation_id, correlation_id, metadata)
   */
  async canonicalizeAndEmit({
    source,
    eventType,
    payload,
    namespace,
    logicalId,
    confidence,
    evidence,
    lifecycleStage,
    options = {},
  }) {
    if (!this._eventRuntime) throw new Error('CanonicalizationService: no eventRuntime configured');
    if (!source || typeof source !== 'string') throw new Error('CanonicalizationService: source (string) required');
    if (!eventType || typeof eventType !== 'string') throw new Error('CanonicalizationService: eventType (string) required');
    if (typeof payload !== 'object' || payload === null) throw new Error('CanonicalizationService: payload (object) required');

    const ns = this.resolveNamespace(source, namespace);
    const lifecycle = lifecycleStage || 'observation';

    const envelope = createCanonicalObject({
      kind: eventType,
      payload,
      authority: source,
      options: {
        namespace: ns,
        confidence: confidence === undefined ? 0.5 : confidence,
        metadata: {
          canonical_version: CANONICAL_VERSION,
          lifecycle_stage: lifecycle,
          evidence: evidence || [],
        },
      },
    });

    const result = await this._eventRuntime.emit(eventType, source, payload, {
      ...options,
      namespace: ns,
      logical_id: this._logicalIdentity(payload, logicalId),
      metadata: {
        canonical_object_id: envelope.id,
        canonical_hash: envelope.canonical_hash,
        canonical_version: CANONICAL_VERSION,
        lifecycle_stage: lifecycle,
        evidence: evidence || [],
        // Forward confidence from producer into event metadata so downstream
        // workers and projection subscribers can read it without recomputing.
        confidence: confidence === undefined ? 0.5 : confidence,
        ...(options.metadata || {}),
      },
    });

    return {
      ...result,
      objectId: envelope.id,
      canonicalHash: envelope.canonical_hash,
      canonicalVersion: CANONICAL_VERSION,
      namespace: ns,
      envelope,
      verified: verifyCanonicalObject(envelope),
    };
  }

  /**
   * Duck-typed emit for existing producers that call runtime.emit(eventType, source, payload, options).
   * Allows emitters/workers to be pointed at this service without signature changes.
   */
  async emit(eventType, source, payload, options = {}) {
    return this.canonicalizeAndEmit({
      source,
      eventType,
      payload,
      namespace: options.namespace,
      logicalId: options.logicalId,
      confidence: options.confidence,
      evidence: options.evidence,
      lifecycleStage: options.lifecycleStage,
      options,
    });
  }
}

module.exports = { CanonicalizationService, DEFAULT_NAMESPACE, CANONICAL_VERSION };
