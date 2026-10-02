#!/usr/bin/env node
// jsh-harness.mjs — js-heavy boundary harness (isolated spike).
// Contract: content that requires JavaScript execution is NEVER treated as
// observed fact from a static fetch. Fields flagged rendered_by_js are
// claimable only when js_enabled AND render_complete are both true;
// otherwise they are HELD (reason js-not-rendered-no-guess). Static DOM
// fields are claimable with provenance. Active content quarantines.
//
// Input:
//   { url, js_enabled, render_complete,
//     dom_fields: [{ field, value, rendered_by_js }] }
// field allowlist: title | phone | hours | address | url
//
// Checks (in order):
//   1. envelope is an object
//   2. url: valid absolute HTTP(S), <= 2000 chars, no control chars
//   3. js_enabled, render_complete: booleans
//   4. dom_fields: array of 0..50 entries; each { field in allowlist,
//      value: 1..500 chars, rendered_by_js: boolean }; NUL-free
//   5. active-content marker scan over field values -> quarantine
//   6. classification: rendered when js_enabled && render_complete;
//      static-only when !js_enabled; render-incomplete when js_enabled &&
//      !render_complete. JS-rendered fields are claimed only under
//      "rendered"; otherwise held.
import { createHash } from "node:crypto";

export const JSH_PARSER_VERSION = "jsh-1.0.0";

const URL_CAP = 2000;
const VALUE_CAP = 500;
const FIELDS_CAP = 50;
const FIELDS = ["title", "phone", "hours", "address", "url"];
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
      evidence_refs: [sourceRef || "js-render-input"],
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

export function runJsHeavyCase(input, sourceRef = "js-render-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null, held: [] };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: JSH_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);

  const { url, js_enabled, render_complete, dom_fields } = input;

  const eu = validUrl(url);
  if (eu) return fail(eu === "control-char" ? "control-char" : "bad-url", null, sourceRef);

  if (typeof js_enabled !== "boolean") return fail("bad-js-enabled", null, sourceRef);
  if (typeof render_complete !== "boolean") return fail("bad-render-complete", null, sourceRef);

  const fields = dom_fields === undefined ? [] : dom_fields;
  if (!Array.isArray(fields) || fields.length > FIELDS_CAP) return fail("bad-dom-fields", null, sourceRef);
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (typeof f !== "object" || f === null || Array.isArray(f)) return fail("bad-field-entry", `index ${i}`, sourceRef);
    if (!FIELDS.includes(f.field)) return fail("unknown-field", f.field, sourceRef);
    if (typeof f.value !== "string" || f.value.trim().length === 0 || f.value.length > VALUE_CAP) {
      return fail("bad-field-entry", `index ${i}`, sourceRef);
    }
    if (hasCtl(f.value)) return fail("control-char", `dom_fields[${i}].value`, sourceRef);
    if (typeof f.rendered_by_js !== "boolean") return fail("bad-field-entry", `index ${i}`, sourceRef);
  }

  for (let i = 0; i < fields.length; i++) {
    const low = fields[i].value.toLowerCase();
    if (MARKERS.some((m) => low.includes(m))) {
      put("jsh_verdict", "quarantine", [{ source: `dom_fields[${i}].value`, locator: "input" }]);
      quar("js-render-input", `dom_fields[${i}].value`, "active-content", "active-content marker in field value");
      return R;
    }
  }

  const rendered = js_enabled === true && render_complete === true;
  const verdict = rendered ? "rendered" : (!js_enabled ? "static-only" : "render-incomplete");

  put("jsh_verdict", verdict, [{ source: "classification", locator: "js_enabled + render_complete" }]);
  put("jsh_page_url", url, [{ source: "url", locator: "input.url" }]);

  for (const f of fields) {
    if (!f.rendered_by_js || rendered) {
      put(`jsh_${f.field}`, f.value,
        [{ source: f.rendered_by_js ? "js-render" : "static-dom", locator: "dom_fields[]" }]);
    } else {
      R.held.push({ field: `jsh_${f.field}`, reason: "js-not-rendered-no-guess", rendered_by_js: true });
    }
  }
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
