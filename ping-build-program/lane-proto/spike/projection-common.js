/**
 * Spike: shared canonical helpers for protocol projections.
 *
 * INVARIANT: projectors never mutate the canonical object. The runner
 * deep-freezes the input before projecting; these helpers treat every
 * read as frozen by construction (no writes, no derived caches that
 * alias canonical fields).
 */
"use strict";

const crypto = require("crypto");

/** Deterministic JSON: objects have keys sorted recursively. */
function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k]))
      .join(",") +
    "}"
  );
}

function inputHash(canonical) {
  return "sha256:" + crypto.createHash("sha256").update(canonicalJson(canonical)).digest("hex");
}

/** Public facts only. PRIVATE facts are withheld at projection time (same
 *  policy as PING's sanitizeFields / structured-data.ts PRIVATE_PROPERTIES). */
function publicFacts(canonical) {
  return (canonical.facts || []).filter((f) => f.visibility === "public");
}

function publicServices(canonical) {
  return (canonical.services || []).filter((s) => s.visibility === "public");
}

function factValue(canonical, field) {
  const f = publicFacts(canonical).find((x) => x.field === field);
  return f ? f.value : undefined;
}

/** Every projector carries the same provenance header shape (mirrors
 *  PING's src/types/projections.ts discipline: projectionId,
 *  canonicalGraphVersion, inputHash). A consumer MUST verify inputHash
 *  against the current canonical before trusting the projection. */
function projectionHeader(canonical, kind) {
  return {
    projectionKind: kind,
    projectionId: `proj:${canonical.canonicalId}:${kind}:${inputHash(canonical).slice(7, 19)}`,
    canonicalId: canonical.canonicalId,
    canonicalGraphVersion: canonical.canonicalGraphVersion,
    inputHash: inputHash(canonical),
    generatedAt: new Date().toISOString(),
    isProjectionNotAuthority: true,
  };
}

/** Evidence manifest: every rendered claim traces to evidence ids. */
function evidenceManifest(canonical) {
  const out = [];
  for (const f of publicFacts(canonical)) {
    out.push({ field: f.field, value: f.value, evidence: f.evidence });
  }
  for (const s of publicServices(canonical)) {
    out.push({ field: "service", value: s.name, evidence: s.evidence });
  }
  out.sort((a, b) => (a.field + "|" + JSON.stringify(a.value)) < (b.field + "|" + JSON.stringify(b.value)) ? -1 : 1);
  return out;
}

module.exports = {
  canonicalJson,
  inputHash,
  publicFacts,
  publicServices,
  factValue,
  projectionHeader,
  evidenceManifest,
};
