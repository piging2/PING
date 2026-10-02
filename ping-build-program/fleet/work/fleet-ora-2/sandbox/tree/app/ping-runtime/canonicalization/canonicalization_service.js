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
 *   - resolve + validate the namespace before persistence (core:: / tenant::)
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

const CANONICAL_VERSION = '1.0.0';
const DEFAULT_NAMESPACE = 'core::owner';
const NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

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
   * @param {object} [options.namespaces] — source → namespace map (e.g. { 'review-authority': 'tenant::hpp' })
   * @param {string} [options.defaultNamespace] — fallback namespace (default 'core::owner')
   */
  constructor(options = {}) {
    this._eventRuntime = options.eventRuntime || null;
    this._namespaces = options.namespaces || {};
    this._defaultNamespace = options.defaultNamespace || DEFAULT_NAMESPACE;
  }

  /**
   * Resolve and validate the namespace for a source.
   * Priority: explicit request > per-source map > default.
   */
  resolveNamespace(source, requested) {
    const namespace = requested || this._namespaces[source] || this._defaultNamespace;
    if (!NAMESPACE_RE.test(namespace)) {
      throw new Error(`Invalid namespace: '${namespace}' (must be core::<name> or tenant::<id>)`);
    }
    return namespace;
  }

  /**
   * Authorize a producer's namespace claim at the boundary (audit §7 #1).
   * Producers' allowed namespaces = the per-source map + explicit override,
   * resolved by the same rule as resolveNamespace. This is the guard decision
   * (authorized: true/false) the boundary route uses before canonicalizing;
   * it wraps resolveNamespace so resolution + validation have exactly one owner.
   *
   * @param {string} source — producing source/authority ID
   * @param {string} [requested] — explicit namespace override (optional)
   * @returns {{authorized: true, namespace: string} | {authorized: false, reason: string}}
   */
  authorizeNamespace(source, requested) {
    try {
      const namespace = this.resolveNamespace(source, requested);
      return { authorized: true, namespace };
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
   * @param {string} [input.namespace] — explicit namespace override
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
