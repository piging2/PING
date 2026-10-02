#!/usr/bin/env node
// con-harness.mjs — deterministic gate for third-party software connector
// configurations. Read-only fixture cognition; no PING writes, no network.
//
// Contract:
// - Input is { connector, config }. Connector is an exact allowlist match:
//   google-calendar, quickbooks, stripe, mailchimp, hubspot, slack.
// - Each connector declares required config keys. Missing keys are a typed
//   failure; extra keys are ignored but their values are still scanned.
// - Values must be non-empty strings within a 1000-char cap, NUL-free.
// - Every string value (required or extra) is scanned for active-content
//   markers; a hit is a typed quarantine, never a reclassification.
// - Keys ending in _url require a parseable http(s) URL with a host and no
//   control characters. No scheme guessing, no format guessing on tokens:
//   the gate does not pretend to know a provider's key format.
import { createHash } from "node:crypto";

export const CON_PARSER_VERSION = "con-1.0.0";

const CONNECTORS = {
  "google-calendar": ["client_id", "calendar_id"],
  quickbooks: ["realm_id", "access_token_ref"],
  stripe: ["publishable_key_ref"],
  mailchimp: ["api_key_ref", "server_prefix"],
  hubspot: ["access_token_ref"],
  slack: ["webhook_url"],
};

const VALUE_CAP = 1000;
const ACTIVE_MARKERS = ["<script", "<?php", "<iframe", "onload=", "onerror="];
const CTRL_IN_URL = /[\t\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/;

function sha256(s) { return createHash("sha256").update(s, "utf8").digest("hex"); }

export function runConnectorCase(input, sourceRef = "connector-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, failure: null };
  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: sourceRef, locator }], parser: CON_PARSER_VERSION });
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
    return fail("INVALID_PAYLOAD", "not-an-object", "Input must be a JSON object.");
  const { connector, config } = input;

  // 2. Connector allowlist. Exact match only.
  if (typeof connector !== "string") return fail("INVALID_PAYLOAD", "bad-connector", "connector must be a string.");
  const required = CONNECTORS[connector];
  if (!required) return fail("INVALID_PAYLOAD", "unknown-connector", `Connector '${connector}' is not supported.`);

  // 3. Config shape.
  if (typeof config !== "object" || config === null || Array.isArray(config))
    return fail("INVALID_PAYLOAD", "bad-config", "config must be a JSON object.");

  // 4. Required keys present.
  for (const k of required) {
    if (!(k in config)) return fail("INVALID_PAYLOAD", "missing-config-key", `Required key '${k}' is missing.`);
  }

  // 5. Value shapes: non-empty strings, NUL-free, within cap.
  for (const [k, v] of Object.entries(config)) {
    if (typeof v !== "string") return fail("INVALID_PAYLOAD", "bad-config-value", `Value for '${k}' must be a string.`);
    if (v.trim().length === 0) return fail("INVALID_PAYLOAD", "empty-config-value", `Value for '${k}' is empty.`);
    if (v.includes("\0")) return fail("INVALID_PAYLOAD", "control-char", `Value for '${k}' contains NUL.`);
    if (v.length > VALUE_CAP) return fail("INVALID_PAYLOAD", "over-value-cap", `Value for '${k}' exceeds ${VALUE_CAP} chars.`);
  }

  // 6. Active-content markers across ALL values, extras included. Held, never reclassified.
  for (const [k, v] of Object.entries(config)) {
    if (ACTIVE_MARKERS.some((m) => v.toLowerCase().includes(m))) {
      put("con_format", "connector-config", "format");
      put("con_connector", connector, "connector");
      put("con_verdict", "quarantine", "verdict");
      quar("connector-config-value", k, "active-content", `key=${k} value_sha256=${sha256(v)}`);
      return R;
    }
  }

  // 7. *_url keys: no control chars, strict http(s) with a host.
  for (const [k, v] of Object.entries(config)) {
    if (!k.endsWith("_url")) continue;
    if (CTRL_IN_URL.test(v)) return fail("INVALID_PAYLOAD", "control-char-in-url", `URL value for '${k}' contains control characters.`);
    let u;
    try { u = new URL(v); }
    catch { return fail("INVALID_PAYLOAD", "invalid-url", `URL value for '${k}' is not parseable.`); }
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname)
      return fail("INVALID_PAYLOAD", "invalid-url", `URL value for '${k}' must use http(s) with a host.`);
  }

  put("con_format", "connector-config", "format");
  put("con_connector", connector, "connector");
  put("con_verdict", "accept", "verdict");
  return R;
}
