#!/usr/bin/env node
// pvo-harness.mjs — provider-outage boundary harness (isolated spike).
// Contract: an outage is NEVER mistaken for an observation. Transport
// failures, timeouts, DNS/TLS failures, and HTTP errors yield verdict
// "outage" (with an explicit outage class) or "error"; body identity is
// claimed only on success with status 200. Error detail is claimed only
// when present and bounded; it is never inferred.
// Active content markers quarantine regardless of outcome.
//
// Input:
//   { url, outcome, http_status?, error_detail?, body? }
// outcome enum: transport-error | timeout | dns-failure | tls-failure |
//               http-error | success
//
// Checks (in order):
//   1. envelope is an object
//   2. url: valid absolute HTTP(S), <= 2000 chars, no control chars
//   3. outcome: known enum value
//   4. http_status: required+integer 100..599 for success|http-error;
//      forbidden otherwise
//   5. error_detail: absent | string 1..500 chars, NUL-free
//   6. body: absent | string 0..10000 chars, NUL-free
//   7. active-content marker scan over body -> quarantine
//   8. classification: success+200 -> ok (hash body if present);
//      success+other -> error; http-error -> outage class http-error;
//      others -> outage with their class.
import { createHash } from "node:crypto";

export const PVO_PARSER_VERSION = "pvo-1.0.0";

const URL_CAP = 2000;
const BODY_CAP = 10000;
const DETAIL_CAP = 500;
const MARKERS = ["<script", "<iframe", "onerror", "onload", "<?php"];
const OUTCOMES = ["transport-error", "timeout", "dns-failure", "tls-failure", "http-error", "success"];

const hasCtl = (s) => /[\u0000-\u001F\u007F]/.test(s);

function fail(signal, detail, sourceRef) {
  return {
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {}, unresolved: [],
    failure: {
      record_type: "ping.connector.failure.v1",
      class: "INVALID_PAYLOAD",
      retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail || signal).slice(0, 500) },
      evidence_refs: [sourceRef || "attempt-outcome"],
    },
  };
}

function validUrl(u) {
  if (typeof u !== "string" || u.length === 0 || u.length > URL_CAP) return "bad-url";
  if (hasCtl(u)) return "control-char";
  let p;
  try { p = new URL(u); } catch { return "bad-url"; }
  if ((p.protocol !== "http:" && p.protocol !== "https:") || !p.host) return "bad-url";
  return null;
}

export function runProviderOutageCase(input, sourceRef = "attempt-outcome") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: PVO_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);
  const { url, outcome, http_status, error_detail, body } = input;

  const eu = validUrl(url);
  if (eu) return fail(eu === "control-char" ? "control-char" : "bad-url", null, sourceRef);

  if (!OUTCOMES.includes(outcome)) return fail("bad-outcome", null, sourceRef);

  const needsStatus = outcome === "success" || outcome === "http-error";
  if (needsStatus) {
    if (!Number.isInteger(http_status) || http_status < 100 || http_status > 599) {
      return fail("bad-status", null, sourceRef);
    }
  } else if (http_status !== undefined) {
    return fail("status-not-applicable", null, sourceRef);
  }

  if (error_detail !== undefined) {
    if (typeof error_detail !== "string" || error_detail.trim().length === 0 ||
        error_detail.length > DETAIL_CAP || error_detail.includes("\u0000")) {
      return fail("bad-error-detail", null, sourceRef);
    }
  }

  const b = body === undefined || body === null ? null : body;
  if (b !== null && (typeof b !== "string" || b.length > BODY_CAP || b.includes("\u0000"))) {
    return fail("bad-body", null, sourceRef);
  }

  if (b !== null && MARKERS.some((m) => b.toLowerCase().includes(m))) {
    put("pvo_verdict", "quarantine", [{ source: "body", locator: "input.body" }]);
    put("pvo_page_url", url, [{ source: "url", locator: "input.url" }]);
    quar("attempt-outcome", "input.body", "active-content", "active-content marker in body");
    return R;
  }

  let verdict, outageClass = null;
  if (outcome === "success") {
    verdict = http_status === 200 ? "ok" : "error";
  } else if (outcome === "http-error") {
    verdict = "outage"; outageClass = "http-error";
  } else {
    verdict = "outage"; outageClass = outcome;
  }

  put("pvo_verdict", verdict, [{ source: "classification", locator: "outcome + http_status" }]);
  put("pvo_page_url", url, [{ source: "url", locator: "input.url" }]);
  if (outageClass) {
    put("pvo_outage_class", outageClass, [{ source: "outcome", locator: "input.outcome" }]);
  }
  if (error_detail !== undefined) {
    put("pvo_error_detail", error_detail, [{ source: "error_detail", locator: "input.error_detail" }]);
  }
  if (verdict === "ok" && b !== null) {
    put("pvo_body_sha256", createHash("sha256").update(b).digest("hex"),
      [{ source: "body", locator: "input.body" }]);
  }
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
