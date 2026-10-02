'use strict';
/**
 * ProducerEventPort — Phase 7 producer migration seam (2026-09-19).
 *
 * PING event authority convergence: "migrate producers not data".
 *
 * The four HPP business authorities (Review, Project, Customer, AIWorkspace)
 * and the POST /canonical-events HTTP surface previously held a direct
 * handle on CanonicalEventEnvelope.executeEmitEvent (a receipt surface whose
 * UUID/MAX+1 machinery was refactored in Phase 3). This port replaces that
 * handle. The producer call shape is PRESERVED:
 *
 *   { tenantId, eventType, source, actor, payload, causationId, correlationId, metadata }
 *
 * What changes is the authority behind the call. Per the Phase 3/5 seam
 * proof, the port routes each emission through exactly one of two proven
 * seams, chosen by the event type's HPP type classification (documented in
 * ~/workspace/forensics/phase7-producer-migration-2026-09-19.md):
 *
 *   DIRECT (registered canonical type, or mapped to one):
 *     Producer -> UER.emit (authoritative commit, constitutional identity,
 *     canonical namespace, acceptance timestamp) -> ping_events ->
 *     deriveRepresentationAfterCommit (certified representation in
 *     canonical_events). No reminting, no second commit, no mission
 *     redispatch from derivation.
 *
 *   RECEIPT (domain envelope type: producer-controlled, unregistered):
 *     Producer -> CanonicalEventEnvelope.executeEmitEvent (receipt surface;
 *     receipt identity / receipt ordering / receipt timestamp / tenant claim
 *     explicitly labeled, never promoted) -> LegacyIngressAdapter (the
 *     allowlisted MC-1 convergence path, two-phase with the documented
 *     capability-bound compatibility exception) -> UER acceptance ->
 *     ping_events.
 *
 * Standing distinctions, enforced here:
 *   envelope/port call shape != constitutional semantics;
 *   receipt identity != canonical event_id;
 *   receipt ordering (per-tenant MAX+1) != canonical event sequence;
 *   receipt timestamp != constitutional acceptance timestamp;
 *   tenant claim (unverified, F3 frozen) != canonical namespace.
 *
 * Fail-closed rules:
 *   - A malformed tenant claim is rejected, never silently collapsed to
 *     core::system (mirrors the adapter's authorization layer).
 *   - A registered/mapped type with no bound event runtime is refused; the
 *     port never silently falls back to the receipt path for a type that
 *     must be accepted directly.
 *   - The port never mints identity, never writes ping_events itself, never
 *     dispatches missions. Mission dispatch happens only via UER.emit's
 *     handler fan-out (EventToMissionBridge), exactly once per accepted
 *     event; representation derivation never redispatches.
 */

const { deriveRepresentationAfterCommit } = require('./convergence_derivation.js');

/**
 * Producer type -> registered canonical type. This mapping is a
 * producer-port decision, NOT a registry change: it consolidates the HPP
 * dotted spellings into the canonical types the governance registry already
 * assigns to these authorities (authority_owner matches the producer).
 * The original producer spelling is preserved in metadata.producer_event_type
 * and returned on the result for compatibility readers.
 */
const CANONICAL_TYPE_MAP = {
  'project.created': 'PROJECT_CREATED',
  'project.updated': 'PROJECT_UPDATED',
};

/**
 * Canonical namespace rule, mirrored from LegacyIngressAdapter._resolveNamespace:
 * tenant::<claim> must match the canonical privacy boundary. A malformed
 * claim fails closed here, before any commit.
 */
const CANONICAL_NAMESPACE_RE = /^(core|tenant)::[a-zA-Z0-9_-]+$/;

class ProducerEventPort {
  /**
   * @param {object} options
   * @param {object} options.envelope - CanonicalEventEnvelope (receipt surface + acceptCanonicalEvent)
   * @param {object} [options.governance] - EventGovernance (loaded); without it every type takes the receipt path
   * @param {function} [options.getEventRuntime] - lazy thunk returning the UnifiedEventRuntime (may be bound later)
   */
  constructor(options = {}) {
    if (!options.envelope || typeof options.envelope.executeEmitEvent !== 'function') {
      throw new Error('ProducerEventPort: envelope with executeEmitEvent() is required');
    }
    this._envelope = options.envelope;
    this._governance = options.governance || null;
    this._getEventRuntime = typeof options.getEventRuntime === 'function' ? options.getEventRuntime : () => null;
    this._registeredTypes = null; // lazily built from governance
    this._stats = { direct: 0, receipt: 0, rejected: 0 };
  }

  _canonicalTypeFor(producerType) {
    return CANONICAL_TYPE_MAP[producerType] || producerType;
  }

  _registeredSet() {
    if (this._registeredTypes) return this._registeredTypes;
    const set = new Set();
    if (this._governance && typeof this._governance.getOwnershipPolicy === 'function') {
      for (const rule of this._governance.getOwnershipPolicy()) {
        if (rule && rule.event_type) set.add(rule.event_type);
      }
    }
    this._registeredTypes = set;
    return set;
  }

  /**
   * Resolve the canonical namespace from the producer's tenant claim.
   * Fail-closed on malformed claims: never collapse to core::system.
   */
  _resolveNamespace(tenantId) {
    const namespace = `tenant::${tenantId}`;
    if (typeof tenantId !== 'string' || !CANONICAL_NAMESPACE_RE.test(namespace)) {
      return {
        ok: false,
        reason: `malformed tenant claim ${JSON.stringify(tenantId)}: refusing to collapse to core::system (fail-closed)`,
      };
    }
    return { ok: true, namespace };
  }

  _validateShape(args) {
    const missing = [];
    if (!args.tenantId) missing.push('tenantId');
    if (!args.eventType) missing.push('eventType');
    if (!args.source) missing.push('source');
    if (!args.actor) missing.push('actor');
    if (!args.payload || typeof args.payload !== 'object' || Array.isArray(args.payload)) missing.push('payload');
    if (missing.length > 0) {
      throw new Error(`ProducerEventPort.emitProducerEvent: missing required: ${missing.join(', ')}`);
    }
  }

  /**
   * Emit a producer event through the classified seam.
   *
   * @param {object} args - producer call shape (preserved from the envelope contract)
   * @returns {Promise<object>} { status, seam: 'direct'|'receipt', ... }
   */
  async emitProducerEvent(args = {}) {
    this._validateShape(args);
    const { tenantId, eventType, source, actor, payload } = args;
    const causationId = args.causationId || null;
    const correlationId = args.correlationId || null;
    const producerMetadata = (args.metadata && typeof args.metadata === 'object') ? args.metadata : {};

    const canonicalType = this._canonicalTypeFor(eventType);
    const isMapped = canonicalType !== eventType;

    if (this._registeredSet().has(canonicalType)) {
      return this._emitDirect({
        tenantId, eventType, canonicalType, isMapped, source, actor, payload,
        causationId, correlationId, producerMetadata,
      });
    }
    return this._emitReceipt({
      tenantId, eventType, source, actor, payload,
      causationId, correlationId, producerMetadata,
    });
  }

  /**
   * DIRECT seam: registered canonical type -> UER authoritative commit ->
   * certified representation derived after commit. The representation
   * derivation never re-emits and never dispatches missions.
   */
  async _emitDirect({ tenantId, eventType, canonicalType, isMapped, source, actor, payload, causationId, correlationId, producerMetadata }) {
    const runtime = this._getEventRuntime();
    if (!runtime || typeof runtime.emit !== 'function') {
      this._stats.rejected++;
      throw new Error(
        `ProducerEventPort: event runtime not bound; refusing registered type '${canonicalType}' ` +
        '(fail-closed: no silent receipt fallback for a type that must be accepted directly)'
      );
    }
    const ns = this._resolveNamespace(tenantId);
    if (!ns.ok) {
      this._stats.rejected++;
      throw new Error(`ProducerEventPort: ${ns.reason}`);
    }

    const emitResult = await runtime.emit(canonicalType, source, payload, {
      namespace: ns.namespace,
      causation_id: causationId,
      correlation_id: correlationId,
      metadata: {
        ...producerMetadata,
        producer_event_port: '1.0.0',
        seam: 'phase7-direct',
        tenant_claim: tenantId,
        // actor is an UNVERIFIED CLAIM (F3 frozen): carried as claim, never
        // presented as an authenticated principal.
        actor,
        actor_claim: actor,
        ...(isMapped ? { producer_event_type: eventType } : {}),
      },
    });

    if (!emitResult || emitResult.status !== 'ok' || !emitResult.event || !emitResult.event.event_id) {
      this._stats.rejected++;
      return {
        status: 'error',
        seam: 'direct',
        event_type: canonicalType,
        ...(isMapped ? { producer_event_type: eventType } : {}),
        code: (emitResult && emitResult.code) || 'EMIT_FAILED',
        error: (emitResult && (emitResult.error || emitResult.reason)) || 'authoritative commit failed',
      };
    }

    // Model B: derive the certified representation AFTER the one
    // authoritative commit. No second commit, no remint, no redispatch.
    const derived = await deriveRepresentationAfterCommit({
      envelope: this._envelope,
      emitResult,
    });

    this._stats.direct++;
    return {
      status: 'accepted',
      seam: 'direct',
      event_id: emitResult.event.event_id,
      event_type: canonicalType,
      ...(isMapped ? { producer_event_type: eventType } : {}),
      namespace: ns.namespace,
      derivation: derived && derived.status === 'ok'
        ? { ok: true, inserted: !!derived.inserted, deduped: !!derived.deduped, alreadyRepresented: !!derived.alreadyRepresented }
        : { ok: false, code: derived && derived.code, error: derived && derived.error },
      representation: derived && derived.status === 'ok' ? derived.representation : null,
    };
  }

  /**
   * RECEIPT seam: domain envelope type (producer-controlled, unregistered) ->
   * envelope receipt with explicit receipt semantics -> convergence via the
   * allowlisted LegacyIngressAdapter (MC-1). This method performs NO
   * acceptance of its own; acceptance is UER's, through the adapter.
   */
  async _emitReceipt({ tenantId, eventType, source, actor, payload, causationId, correlationId, producerMetadata }) {
    const receipt = await this._envelope.executeEmitEvent({
      tenantId,
      eventType,
      source,
      actor,
      payload,
      causationId,
      correlationId,
      metadata: {
        ...producerMetadata,
        producer_event_port: '1.0.0',
        seam: 'phase7-receipt',
        // RECEIPT SEMANTICS (explicit, standing law 2026-09-19): every
        // field on the receipt row is receipt-side and must never be
        // silently promoted into constitutional semantics.
        receipt_semantics: {
          identity: 'receipt (ingress-era row identity; never the canonical event identity)',
          ordering: 'receipt (per-tenant MAX+1; never the canonical log position)',
          timestamp: 'receipt (never the constitutional acceptance timestamp)',
          tenant: 'claim (unverified; canonical namespace tenant::<id> resolved at adapter authorization, fail-closed)',
        },
        acceptance: 'UnifiedEventRuntime.emit via allowlisted LegacyIngressAdapter (MC-1 documented compatibility exception)',
      },
    });

    this._stats.receipt++;
    return {
      status: 'received',
      seam: 'receipt',
      event_type: eventType,
      receipt,
      acceptance: 'pending LegacyIngressAdapter convergence (allowlisted); not accepted until converged',
    };
  }

  getStats() {
    return { ...this._stats };
  }
}

module.exports = { ProducerEventPort, CANONICAL_TYPE_MAP };
