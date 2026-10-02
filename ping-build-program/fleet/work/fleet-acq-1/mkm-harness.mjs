#!/usr/bin/env node
// mkm-harness.mjs — malformed-markup boundary harness (isolated spike).
// Contract: NO content is ever extracted as fact from markup. The only
// claims are the markup identity hash, the page URL, and a structural
// verdict (wellformed | malformed | quarantine). Malformed markup yields
// a typed reason; content is never reconstructed or guessed.
// Active content markers quarantine. NUL is a typed INVALID_PAYLOAD.
//
// Input: { url, markup: string (1..10000 chars) }
//
// Malformed signals (deterministic, documented):
//   - "unterminated-comment": <!-- with no later -->
//   - "unterminated-attribute-quote": odd count of "
//   - "unclosed-tag": a "<" with no later ">"
// First signal in that order is reported; the reason is explicit.
import { createHash } from "node:crypto";

export const MKM_PARSER_VERSION = "mkm-1.0.0";

const URL_CAP = 2000;
const MARKUP_CAP = 10000;
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
      evidence_refs: [sourceRef || "markup-input"],
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

export function runMalformedCase(input, sourceRef = "markup-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: MKM_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);
  const { url, markup } = input;

  const eu = validUrl(url);
  if (eu) return fail(eu === "control-char" ? "control-char" : "bad-url", null, sourceRef);

  if (typeof markup !== "string" || markup.length === 0 || markup.length > MARKUP_CAP) {
    return fail("bad-markup", null, sourceRef);
  }
  if (markup.includes("\u0000")) return fail("nul-byte", null, sourceRef);

  const low = markup.toLowerCase();
  if (MARKERS.some((m) => low.includes(m))) {
    put("mkp_verdict", "quarantine", [{ source: "markup", locator: "input.markup" }]);
    put("mkp_markup_sha256", createHash("sha256").update(markup).digest("hex"),
      [{ source: "markup", locator: "input.markup" }]);
    put("mkp_page_url", url, [{ source: "url", locator: "input.url" }]);
    quar("markup-input", "input.markup", "active-content", "active-content marker in markup");
    return R;
  }

  let reason = null;
  let from = 0;
  for (;;) {
    const co = markup.indexOf("<!--", from);
    if (co === -1) break;
    if (markup.indexOf("-->", co) === -1) { reason = "unterminated-comment"; break; }
    from = co + 4;
  }
  if (!reason && (markup.match(/"/g) || []).length % 2 === 1) reason = "unterminated-attribute-quote";
  if (!reason && markup.lastIndexOf("<") > markup.lastIndexOf(">")) reason = "unclosed-tag";

  put("mkp_verdict", reason ? "malformed" : "wellformed",
    [{ source: "structural-scan", locator: "input.markup" }]);
  put("mkp_markup_sha256", createHash("sha256").update(markup).digest("hex"),
    [{ source: "markup", locator: "input.markup" }]);
  put("mkp_page_url", url, [{ source: "url", locator: "input.url" }]);
  if (reason) put("mkp_malformed_reason", reason, [{ source: "structural-scan", locator: "input.markup" }]);
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
