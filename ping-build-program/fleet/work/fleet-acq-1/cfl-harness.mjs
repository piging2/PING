#!/usr/bin/env node
// cfl-harness.mjs — deterministic gate for conflicting source facts.
// Read-only fixture cognition; no PING writes, no network.
//
// Contract:
// - Input is { fact, sources: [{ source, value, ...extras }] }.
// - fact allowlist: name, phone, hours, address, url.
// - 1..5 sources. Every value is a non-empty string within a 500-char cap,
//   NUL-free. Source names are non-empty strings within a 200-char cap.
// - Values and source names are scanned for active-content markers; a hit
//   is a typed quarantine, never a reclassification.
// - Corroboration is exact: byte-identical values corroborate, anything
//   else conflicts. No case folding, no trimming, no unicode normalization.
//   The gate never resolves a conflict by guess.
// - All-agree: claims cfl_value with per-source provenance.
// - Disagreement: NO cfl_value claim; the conflict is recorded in
//   `unresolved` with grouped candidates.
// - Single source: uncorroborated; no cfl_value claim. An absence of
//   corroboration is not evidence.
import { createHash } from "node:crypto";

export const CFL_PARSER_VERSION = "cfl-1.0.0";

const FACTS = new Set(["name", "phone", "hours", "address", "url"]);
const VALUE_CAP = 500;
const SOURCE_CAP = 200;
const ACTIVE_MARKERS = ["<script", "<?php", "<iframe", "onload=", "onerror="];

function sha256(s) { return createHash("sha256").update(s, "utf8").digest("hex"); }

export function runConflictCase(input, sourceRef = "conflict-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, unresolved: [], failure: null };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: CFL_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });
  const fail = (cls, signal, detail) => ({
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {}, unresolved: [],
    failure: {
      record_type: "ping.connector.failure.v1",
      class: cls,
      retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail).slice(0, 500) },
      evidence_refs: [sourceRef],
    },
  });

  // 1. Envelope shape.
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return fail("INVALID_PAYLOAD", "not-an-object", "Input must be a JSON object.");
  const { fact, sources } = input;

  // 2. Fact allowlist. Strict.
  if (typeof fact !== "string") return fail("INVALID_PAYLOAD", "bad-fact", "fact must be a string.");
  if (!FACTS.has(fact)) return fail("INVALID_PAYLOAD", "unknown-fact", `Fact '${fact}' is not supported.`);

  // 3. Sources array bounds.
  if (!Array.isArray(sources)) return fail("INVALID_PAYLOAD", "bad-sources", "sources must be an array.");
  if (sources.length === 0) return fail("INVALID_PAYLOAD", "empty-sources", "At least one source is required.");
  if (sources.length > 5) return fail("INVALID_PAYLOAD", "too-many-sources", "At most 5 sources per fact.");

  // 4. Entry shapes and bounds.
  for (let i = 0; i < sources.length; i++) {
    const e = sources[i];
    const where = `sources[${i}]`;
    if (typeof e !== "object" || e === null || Array.isArray(e))
      return fail("INVALID_PAYLOAD", "bad-source-entry", `${where} must be an object.`);
    if (typeof e.source !== "string" || e.source.trim().length === 0)
      return fail("INVALID_PAYLOAD", "bad-source-entry", `${where}.source must be a non-empty string.`);
    if (typeof e.value !== "string")
      return fail("INVALID_PAYLOAD", "bad-source-entry", `${where}.value must be a string.`);
    if (e.value.trim().length === 0)
      return fail("INVALID_PAYLOAD", "empty-source-value", `${where}.value is empty.`);
    if (e.value.includes("\0") || e.source.includes("\0"))
      return fail("INVALID_PAYLOAD", "control-char", `${where} contains NUL.`);
    if (e.value.length > VALUE_CAP)
      return fail("INVALID_PAYLOAD", "over-value-cap", `${where}.value exceeds ${VALUE_CAP} chars.`);
    if (e.source.length > SOURCE_CAP)
      return fail("INVALID_PAYLOAD", "over-source-name-cap", `${where}.source exceeds ${SOURCE_CAP} chars.`);
  }

  // 5. Active-content markers across values and source names. Held, never reclassified.
  for (let i = 0; i < sources.length; i++) {
    const e = sources[i];
    const hit = [e.value, e.source].some((s) => ACTIVE_MARKERS.some((m) => s.toLowerCase().includes(m)));
    if (hit) {
      put("cfl_format", "fact-conflict", [{ source: sourceRef, locator: "format" }]);
      put("cfl_fact", fact, [{ source: sourceRef, locator: "fact" }]);
      put("cfl_verdict", "quarantine", [{ source: sourceRef, locator: "verdict" }]);
      quar("conflict-source-value", `sources[${i}]`, "active-content", `value_sha256=${sha256(e.value)}`);
      return R;
    }
  }

  // 6. Corroboration: exact byte equality only.
  const prov = [{ source: sourceRef, locator: "fact" }];
  put("cfl_format", "fact-conflict", [{ source: sourceRef, locator: "format" }]);
  put("cfl_fact", fact, prov);
  put("cfl_source_count", sources.length, [{ source: sourceRef, locator: "sources" }]);

  const groups = new Map();
  for (const e of sources) {
    if (!groups.has(e.value)) groups.set(e.value, []);
    groups.get(e.value).push(e.source);
  }

  if (sources.length === 1) {
    put("cfl_verdict", "uncorroborated", prov);
    R.unresolved.push({ field: "cfl_value", reason: "uncorroborated-single-source-no-guess",
      candidates: [{ value: sources[0].value, sources: [sources[0].source] }] });
    return R;
  }

  if (groups.size === 1) {
    const value = sources[0].value;
    put("cfl_verdict", "corroborated", prov);
    put("cfl_value", value, sources.map((e) => ({ source: e.source, locator: "sources[].value" })));
    return R;
  }

  const candidates = [...groups.entries()].map(([value, names]) => ({ value, sources: names }));
  put("cfl_verdict", "conflict", prov);
  R.unresolved.push({ field: "cfl_value", reason: "conflicting-sources", candidates });
  return R;
}
