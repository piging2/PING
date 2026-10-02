#!/usr/bin/env node
// rtl-harness.mjs — rate-limits boundary harness (isolated spike).
// Contract: a rate-limited fetch is NEVER treated as an observation of
// content. Body identity (rtl_body_sha256) is claimed only when the status
// is 200; 429/503 bodies are never hashed or extracted (no-guess).
// retry_after_seconds is claimed only when present, finite, non-negative,
// and <= 604800. Active content markers quarantine regardless of status.
//
// Input:
//   { url, http_status, retry_after_seconds?, rate_limit_remaining?, body? }
//
// Checks (in order):
//   1. envelope is an object
//   2. url: valid absolute HTTP(S), <= 2000 chars, no control chars
//   3. http_status: integer 100..599
//   4. retry_after_seconds: absent | finite number 0..604800
//   5. rate_limit_remaining: absent | non-negative integer
//   6. body: absent | string 0..10000 chars, NUL-free
//   7. active-content marker scan over body -> quarantine
//   8. classification: 429 -> rate-limited; 503 -> rate-limited iff
//      retry_after_seconds or rate_limit_remaining present, else error;
//      200 -> ok; other 4xx/5xx -> error; 1xx/3xx -> error.
import { createHash } from "node:crypto";

export const RTL_PARSER_VERSION = "rtl-1.0.0";

const URL_CAP = 2000;
const BODY_CAP = 10000;
const RETRY_AFTER_CAP = 604800; // 7 days
const MARKERS = ["<script", "<iframe", "onerror", "onload", "<?php"];

const hasCtl = (s) => /[\u0000-\u001F\u007F]/.test(s);

function fail(signal, detail, sourceRef) {
  return {
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {}, unresolved: [],
    failure: {
      record_type: "ping.connector.failure.v1",
      class: "INVALID_PAYLOAD",
      retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail || signal).slice(0, 500) },
      evidence_refs: [sourceRef || "fetch-outcome"],
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

export function runRateLimitCase(input, sourceRef = "fetch-outcome") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: RTL_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);
  const { url, http_status, retry_after_seconds, rate_limit_remaining, body } = input;

  const eu = validUrl(url);
  if (eu) return fail(eu === "control-char" ? "control-char" : "bad-url", null, sourceRef);

  if (!Number.isInteger(http_status) || http_status < 100 || http_status > 599) {
    return fail("bad-status", null, sourceRef);
  }

  if (retry_after_seconds !== undefined) {
    if (typeof retry_after_seconds !== "number" || !Number.isFinite(retry_after_seconds) ||
        retry_after_seconds < 0 || retry_after_seconds > RETRY_AFTER_CAP) {
      return fail("bad-retry-after", null, sourceRef);
    }
  }

  if (rate_limit_remaining !== undefined) {
    if (!Number.isInteger(rate_limit_remaining) || rate_limit_remaining < 0) {
      return fail("bad-rate-limit-remaining", null, sourceRef);
    }
  }

  const b = body === undefined ? null : body;
  if (b !== null && (typeof b !== "string" || b.length > BODY_CAP || b.includes("\u0000"))) {
    return fail("bad-body", null, sourceRef);
  }

  if (b !== null && MARKERS.some((m) => b.toLowerCase().includes(m))) {
    put("rtl_verdict", "quarantine", [{ source: "body", locator: "input.body" }]);
    put("rtl_page_url", url, [{ source: "url", locator: "input.url" }]);
    quar("fetch-outcome", "input.body", "active-content", "active-content marker in body");
    return R;
  }

  let verdict;
  if (http_status === 429) verdict = "rate-limited";
  else if (http_status === 503) verdict = (retry_after_seconds !== undefined || rate_limit_remaining !== undefined) ? "rate-limited" : "error";
  else if (http_status === 200) verdict = "ok";
  else verdict = "error";

  put("rtl_verdict", verdict, [{ source: "classification", locator: "http_status + signals" }]);
  put("rtl_page_url", url, [{ source: "url", locator: "input.url" }]);
  if (retry_after_seconds !== undefined) {
    put("rtl_retry_after_seconds", retry_after_seconds,
      [{ source: "retry-after", locator: "input.retry_after_seconds" }]);
  }
  if (rate_limit_remaining !== undefined) {
    put("rtl_rate_limit_remaining", rate_limit_remaining,
      [{ source: "rate-limit-remaining", locator: "input.rate_limit_remaining" }]);
  }
  if (verdict === "ok" && b !== null) {
    put("rtl_body_sha256", createHash("sha256").update(b).digest("hex"),
      [{ source: "body", locator: "input.body" }]);
  }
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
