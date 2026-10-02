'use strict';
/**
 * Convergence identity helpers — PING event authority convergence, Phases 3/4/5 (2026-09-19).
 *
 * Pure mechanism: no I/O, no authority decisions. Shared by the
 * CanonicalEventEnvelope (certified representation) and the
 * LegacyIngressAdapter (legacy convergence bridge) so both sides compute the
 * same representation identities and content hashes.
 *
 * Governing law: ONE LOGICAL EVENT -> ONE CANONICAL IDENTITY.
 * The canonical identity is minted once by IdentityAuthority via
 * UnifiedEventRuntime.emit(). Nothing in the convergence layer remints it.
 *
 * Identity roles (never conflated):
 *   canonical_event_id — the logical event's ONE identity (event_<16hex>,
 *     IdentityAuthority V2). Carried, never minted here.
 *   envelope_id — identity of the CERTIFIED REPRESENTATION (this row as an
 *     envelope artifact). Deterministic UUID v5 derived from the canonical
 *     identity. Never presented as the event's identity.
 *   source_event_id — explicit cross-reference column on canonical_events
 *     pointing at the authoritative commit in ping_events.event_id.
 *   ingress_event_id — (legacy rows only) the pre-convergence ingress UUID
 *     preserved on the canonical_events row; historical, never rewritten.
 *
 * Sovereignty: hashing delegates to CanonicalAuthority (the hash authority);
 * canonicalization delegates to CanonicalJson via CanonicalBytes (the
 * canonicalization authority). This module mints no hashes of its own.
 */

const crypto = require('crypto');
const { CanonicalAuthority } = require('../authorities/canonical_authority.js');

// Certified representation version minted by this convergence layer.
const ENVELOPE_VERSION = '2.0.0';

// Era markers recorded on canonical_events rows (metadata.envelope.era).
// Phase 6: historical rows are untouched and interpretable per era.
const CONVERGED_ERA = 'converged';               // derived via acceptCanonicalEvent (UER-first)
const LEGACY_CONVERGED_ERA = 'legacy_converged'; // converged via LegacyIngressAdapter (legacy ingress row)
const INGRESS_ERA = 'ingress';                   // pre-convergence ingress row, not yet converged

// UUID namespace for representation identities: the standard URL namespace,
// disjoint from the DNS namespace (6ba7b810-...) the legacy ingress path used
// for event UUIDs, combined with a 'ping-envelope-repr:v1:' name prefix.
// A representation identity can therefore never collide with a legacy
// ingress event UUID, and deriving it twice yields the same UUID
// (idempotent retries mint the same envelope_id).
const ENVELOPE_REPR_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const ENVELOPE_REPR_NAME_PREFIX = 'ping-envelope-repr:v1:';

function uuidV5(namespaceUuid, name) {
  const ns = Buffer.from(namespaceUuid.replace(/-/g, ''), 'hex');
  const hash = crypto.createHash('sha1').update(ns).update(name, 'utf8').digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant 10
  const h = hash.toString('hex');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20, 32);
}

/**
 * Derive the certified representation's identity from the canonical event
 * identity. Deterministic: the same canonical identity always yields the same
 * envelope_id, so retried derivations never mint a second representation
 * identity. This is NOT an event identity and must never be presented as one.
 *
 * @param {string} canonicalEventId — the ONE canonical identity (event_<16hex>)
 * @returns {string} UUID v5 representation identity
 */
function deriveEnvelopeId(canonicalEventId) {
  if (!canonicalEventId) throw new Error('deriveEnvelopeId: canonicalEventId is required');
  return uuidV5(ENVELOPE_REPR_NAMESPACE, ENVELOPE_REPR_NAME_PREFIX + String(canonicalEventId));
}

/**
 * Normalize a canonical event for content hashing.
 *
 * Included: the identity-determinative content (event_id, event_type, source,
 * namespace, payload, metadata). Excluded:
 *   - sequence: storage metadata allocated by PostgreSQL after identity;
 *     never an input to identity (P0 certification).
 *   - timestamp: wall-clock observation metadata assigned after identity;
 *     UER's logical_id is the timestamp-stripped logical identity, so two
 *     emissions of the same logical event hash identically here, matching
 *     UER's own idempotent-retry semantics.
 *   - metadata.envelope: derivation-added, not part of the canonical content.
 *
 * @param {object} event — canonical event as committed by UnifiedEventRuntime
 * @returns {object} normalized, hash-stable object
 */
function normalizeCanonicalEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('normalizeCanonicalEvent: event object required');
  const metadata = Object.assign({}, event.metadata || {});
  delete metadata.envelope;
  return {
    event_id: String(event.event_id),
    event_type: event.event_type,
    source: event.source,
    namespace: event.namespace,
    payload: event.payload,
    metadata: metadata,
  };
}

/**
 * Content hash of a canonical event for the conflict check.
 * Same identity + same logical content => same hash (idempotent retry).
 * Same identity + different logical content => different hash (fail closed).
 * Delegates to CanonicalAuthority (hash authority).
 *
 * @param {object} event — canonical event
 * @returns {string} sha256 hex
 */
function canonicalEventHash(event) {
  return CanonicalAuthority.hash(normalizeCanonicalEvent(event));
}

module.exports = {
  ENVELOPE_VERSION: ENVELOPE_VERSION,
  CONVERGED_ERA: CONVERGED_ERA,
  LEGACY_CONVERGED_ERA: LEGACY_CONVERGED_ERA,
  INGRESS_ERA: INGRESS_ERA,
  ENVELOPE_REPR_NAMESPACE: ENVELOPE_REPR_NAMESPACE,
  deriveEnvelopeId: deriveEnvelopeId,
  normalizeCanonicalEvent: normalizeCanonicalEvent,
  canonicalEventHash: canonicalEventHash,
};
