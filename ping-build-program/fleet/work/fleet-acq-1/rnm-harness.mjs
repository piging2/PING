#!/usr/bin/env node
// rnm-harness.mjs — renames-redirects boundary harness (isolated spike).
// Contract: a page fetch observation is CLASSIFIED, never guessed into a
// canonical fact. Redirect hops are observed data claimed with provenance;
// the canonical link target is NEVER adopted (recorded as unadopted);
// titles are bounded extractions; active content quarantines.
//
// Input:
//   { requested_url, final_url, status, redirect_chain?, title?, previous_title?, canonical? }
// redirect_chain entries: [{ url, status }]
//
// Checks (in order):
//   1. envelope is an object
//   2. requested_url / final_url: non-empty strings, valid absolute HTTP(S)
//      URLs with host, <= 2000 chars, no control chars (incl. NUL)
//   3. status: integer 200..599
//   4. redirect_chain (if present): array of 1..10 { url, status } entries,
//      each URL valid per (2), each status per (3); last entry URL must equal
//      final_url, else typed failure chain-final-mismatch
//   5. title / previous_title (if present): strings <= 500 chars, NUL-free
//   6. canonical (if present): valid URL per (2), <= 2000 chars
//   7. active-content marker scan over title, previous_title, canonical, and
//      every chain URL -> quarantine (never reclassified)
//   8. classification: redirect if final_url !== requested_url or chain has
//      hops; renamed if previous_title differs from title; else direct.
//      canonical, when present and different from final_url, is reported in
//      `unadopted` (reason canonical-not-adopted-no-guess), never claimed.
import { createHash } from "node:crypto";

export const RNM_PARSER_VERSION = "rnm-1.0.0";

const URL_CAP = 2000;
const TITLE_CAP = 500;
const CHAIN_CAP = 10;
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
      evidence_refs: [sourceRef || "rename-redirect-input"],
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

export function runRenameCase(input, sourceRef = "rename-redirect-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null, unadopted: [] };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: RNM_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);

  const { requested_url, final_url, status, redirect_chain, title, previous_title, canonical } = input;

  const e1 = validUrl(requested_url);
  if (e1) return fail(e1 === "control-char" ? "control-char" : "bad-requested-url", null, sourceRef);
  const e2 = validUrl(final_url);
  if (e2) return fail(e2 === "control-char" ? "control-char" : "bad-final-url", null, sourceRef);

  if (!Number.isInteger(status) || status < 200 || status > 599) return fail("bad-status", null, sourceRef);

  let chain = [];
  if (redirect_chain !== undefined) {
    if (!Array.isArray(redirect_chain) || redirect_chain.length === 0 || redirect_chain.length > CHAIN_CAP) {
      return fail("bad-redirect-chain", null, sourceRef);
    }
    for (let i = 0; i < redirect_chain.length; i++) {
      const e = redirect_chain[i];
      if (typeof e !== "object" || e === null || Array.isArray(e)) return fail("bad-chain-entry", null, sourceRef);
      const eu = validUrl(e.url);
      if (eu) return fail(eu === "control-char" ? "control-char" : "bad-chain-entry", null, sourceRef);
      if (!Number.isInteger(e.status) || e.status < 200 || e.status > 599) return fail("bad-chain-entry", null, sourceRef);
    }
    if (redirect_chain[redirect_chain.length - 1].url !== final_url) return fail("chain-final-mismatch", null, sourceRef);
    chain = redirect_chain;
  }

  for (const [name, t] of [["title", title], ["previous_title", previous_title]]) {
    if (t !== undefined) {
      if (typeof t !== "string" || t.length === 0 || t.length > TITLE_CAP) return fail("bad-title", name, sourceRef);
      if (hasCtl(t)) return fail("control-char", name, sourceRef);
    }
  }

  if (canonical !== undefined) {
    const ec = validUrl(canonical);
    if (ec) return fail(ec === "control-char" ? "control-char" : "bad-canonical", null, sourceRef);
  }

  // marker scan before any claim
  const scanTargets = [];
  if (title !== undefined) scanTargets.push(["title", title]);
  if (previous_title !== undefined) scanTargets.push(["previous_title", previous_title]);
  if (canonical !== undefined) scanTargets.push(["canonical", canonical]);
  chain.forEach((e, i) => scanTargets.push([`redirect_chain[${i}].url`, e.url]));
  for (const [field, text] of scanTargets) {
    const low = text.toLowerCase();
    if (MARKERS.some((m) => low.includes(m))) {
      put("rnm_verdict", "quarantine", [{ source: field, locator: "input" }]);
      quar("rename-redirect-input", field, "active-content", `active-content marker in ${field}`);
      return R;
    }
  }

  const hopCount = chain.length;
  const renamed = previous_title !== undefined && title !== undefined && previous_title !== title;
  const verdict = (final_url !== requested_url || hopCount > 0) ? "redirect"
    : renamed ? "renamed" : "direct";

  put("rnm_verdict", verdict, [{ source: "classification", locator: "requested_url vs final_url" }]);
  put("rnm_requested_url", requested_url, [{ source: "requested_url", locator: "input.requested_url" }]);
  put("rnm_final_url", final_url, [{ source: "final_url", locator: "input.final_url" }]);
  put("rnm_status", status, [{ source: "status", locator: "input.status" }]);
  if (redirect_chain !== undefined) {
    put("rnm_redirect_count", hopCount, [{ source: "redirect_chain", locator: "input.redirect_chain.length" }]);
  }
  if (title !== undefined) {
    put("rnm_title", title, [{ source: "title", locator: "input.title" }]);
  }
  if (canonical !== undefined && canonical !== final_url) {
    R.unadopted.push({ field: "rnm_canonical", reason: "canonical-not-adopted-no-guess",
      detail: "canonical link target recorded, never adopted as canonical fact",
      observed: canonical });
  }
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
