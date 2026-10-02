#!/usr/bin/env node
// corr-harness.mjs — deterministic gate for owner-submitted listing
// corrections. Read-only fixture cognition; no PING writes, no network.
//
// Contract:
// - A correction is { field, old_value?, new_value, submitted_by? }.
// - Field allowlist: name, phone, hours, address, url, description.
//   Unknown fields are a typed failure, never a guess.
// - Per-field length caps; over-cap is a typed failure.
// - Single-line fields (name, phone, url) reject embedded newlines.
// - new_value is scanned for active-content markers; a hit is a typed
//   quarantine, never a reclassification. old_value is never scanned and
//   never capped: it is the prior canonical value, not a new claim.
// - The url field requires a parseable http(s) URL with a host.
//   Anything else is a typed failure, never scheme-guessing.
// - No content normalization of phone/name/address: the gate does not
//   guess formats. Only markers, caps, and structure are checked.
import { createHash } from "node:crypto";

export const COR_PARSER_VERSION = "corr-1.0.0";

const FIELDS = {
  name:        { cap: 200,  singleLine: true },
  phone:       { cap: 40,   singleLine: true },
  hours:       { cap: 500,  singleLine: false },
  address:     { cap: 500,  singleLine: false },
  url:         { cap: 500,  singleLine: true },
  description: { cap: 5000, singleLine: false },
};

const ACTIVE_MARKERS = ["<script", "<?php", "<iframe", "onload=", "onerror="];

function sha256(s) { return createHash("sha256").update(s, "utf8").digest("hex"); }

export function runCorrectionCase(input, sourceRef = "correction-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, failure: null };
  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: sourceRef, locator }], parser: COR_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });
  const fail = (cls, signal, detail) => ({
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {},
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
    return fail("INVALID_PAYLOAD", "not-an-object", "Correction must be a JSON object.");
  const { field, old_value, new_value, submitted_by } = input;

  // 2. Field allowlist. Strict: no case folding, no trimming, no guessing.
  if (typeof field !== "string") return fail("INVALID_PAYLOAD", "bad-field", "field must be a string.");
  const spec = FIELDS[field];
  if (!spec) return fail("INVALID_PAYLOAD", "unknown-field", `Field '${field}' is not correctable.`);

  // 3. new_value shape and bounds.
  if (typeof new_value !== "string") return fail("INVALID_PAYLOAD", "bad-value", "new_value must be a string.");
  if (new_value.trim().length === 0) return fail("INVALID_PAYLOAD", "empty-correction", "new_value is empty.");
  if (new_value.includes("\0")) return fail("INVALID_PAYLOAD", "control-char", "new_value contains NUL.");
  if (new_value.length > spec.cap) return fail("INVALID_PAYLOAD", "over-field-cap", `new_value exceeds ${spec.cap} chars for ${field}.`);
  if (spec.singleLine && /[\n\r]/.test(new_value)) return fail("INVALID_PAYLOAD", "multiline-value", `${field} must be single-line.`);

  // 4. Active-content markers in the NEW value. Held, never reclassified.
  if (ACTIVE_MARKERS.some((m) => new_value.toLowerCase().includes(m))) {
    put("cor_format", "correction", "format");
    put("cor_field", field, "field");
    put("cor_verdict", "quarantine", "verdict");
    quar("correction-new-value", "new_value", "active-content", `value_sha256=${sha256(new_value)}`);
    return R;
  }

  // 5. URL field: no control characters (WHATWG would silently strip them;
  // the gate refuses values that change meaning under normalization),
  // then strict parse, http(s) with a host. No scheme guessing.
  if (field === "url") {
    if (/[\t\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(new_value))
      return fail("INVALID_PAYLOAD", "control-char-in-url", "URL contains control characters.");
    let u;
    try { u = new URL(new_value); }
    catch { return fail("INVALID_PAYLOAD", "invalid-url", "new_value is not a parseable URL."); }
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname)
      return fail("INVALID_PAYLOAD", "invalid-url", "URL must use http(s) with a host.");
  }

  // 6. submitted_by, when present, must be a usable non-empty string.
  if (submitted_by !== undefined) {
    if (typeof submitted_by !== "string" || submitted_by.trim().length === 0)
      return fail("INVALID_PAYLOAD", "bad-submitter", "submitted_by must be a non-empty string.");
    if (submitted_by.length > 200) return fail("INVALID_PAYLOAD", "over-submitter-cap", "submitted_by exceeds 200 chars.");
  }

  // 7. old_value, when present, must be a string. It is otherwise unchecked:
  // the prior canonical value is not a new claim.
  if (old_value !== undefined && typeof old_value !== "string")
    return fail("INVALID_PAYLOAD", "bad-old-value", "old_value must be a string when present.");

  put("cor_format", "correction", "format");
  put("cor_field", field, "field");
  put("cor_verdict", "accept", "verdict");
  put("cor_chars", new_value.length, "new_value");
  return R;
}
