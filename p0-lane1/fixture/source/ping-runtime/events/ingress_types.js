/**
 * RECONSTRUCTED FIXTURE — transitive local dependency of legacy_ingress_adapter.
 * Exists to prove the checker follows the transitive chain, not just the
 * top-level require that crashed.
 */
'use strict';

const KNOWN_KINDS = new Set(['repository_events', 'canonical_events']);

function isKnownKind(kind) {
  return KNOWN_KINDS.has(kind);
}

module.exports = { isKnownKind, KNOWN_KINDS: Array.from(KNOWN_KINDS) };
