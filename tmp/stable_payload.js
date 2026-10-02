'use strict';

// Canonical comparison helper for the generator determinism work.
//
// DECISION (2026-09-19, operator's agent): byte equivalence of a generated
// artifact means equivalence of its STABLE payload. Volatile provenance
// metadata (generatedAt) is intentionally nondeterministic, is classified
// separately, and is excluded from canonical comparison/hashing. This keeps
// intentional nondeterminism explicit and outside deterministic
// constitutional outputs, per PING's determinism law. Full-byte
// reproducibility including generatedAt would be a separate schema decision
// (freeze or remove the field) and is not this patch.
//
// Scope is deliberately minimal: strip exactly the top-level generatedAt
// key. Every tracked orchestration artifact carries exactly one generatedAt,
// at the top level.

function stablePayload(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  const copy = Array.isArray(value) ? value.slice() : Object.assign({}, value);
  if (!Array.isArray(copy)) {
    delete copy.generatedAt;
  }
  return JSON.stringify(copy, null, 2);
}

function stableEqual(a, b) {
  return stablePayload(a) === stablePayload(b);
}

module.exports = { stablePayload, stableEqual };
