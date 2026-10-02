#!/usr/bin/env node
// prt-harness.mjs — partial-pages boundary harness (isolated spike).
// Contract: a page that did not load completely is CLASSIFIED as partial;
// extractions from partial sections are HELD (never claimed); extractions
// attributed to missing or undeclared sections are typed failures; only
// extractions from sections the parser observed as complete may be claimed,
// with per-section provenance. Active content quarantines.
//
// Input:
//   { url, complete, sections: [{ name, status }], extractions?: [{ field, value, section }] }
// section status: "complete" | "partial" | "missing"
// extraction field allowlist: title | phone | hours | address | url
//
// Checks (in order):
//   1. envelope is an object
//   2. url: valid absolute HTTP(S), <= 2000 chars, no control chars
//   3. complete: boolean
//   4. sections: array of 1..20 entries; each { name: 1..100 chars, status in
//      {complete, partial, missing} }; names unique; NUL-free
//   5. extractions (if present): array of 0..50 entries; each
//      { field in allowlist, value: 1..500 chars, section: declared name };
//      extraction from a "missing" section -> typed failure
//      extraction-from-missing-section; undeclared section -> unknown-section
//   6. active-content marker scan over section names and extraction values
//      -> quarantine (never reclassified)
//   7. classification: complete only when complete === true AND every section
//      is "complete"; else partial. Extractions from "complete" sections are
//      claimed as prt_<field> with section provenance; extractions from
//      "partial" sections are held (reason partial-section-no-guess).
import { createHash } from "node:crypto";

export const PRT_PARSER_VERSION = "prt-1.0.0";

const URL_CAP = 2000;
const NAME_CAP = 100;
const VALUE_CAP = 500;
const SECTIONS_CAP = 20;
const EXTRACTIONS_CAP = 50;
const FIELDS = ["title", "phone", "hours", "address", "url"];
const STATUSES = ["complete", "partial", "missing"];
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
      evidence_refs: [sourceRef || "partial-page-input"],
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

export function runPartialCase(input, sourceRef = "partial-page-input") {
  const R = { outcome: "bounded_success", claims: [], quarantined: [],
              truncated: {}, unresolved: [], failure: null, held: [] };
  const put = (field, value, prov) =>
    R.claims.push({ field, value, provenance: prov, parser: PRT_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });

  if (typeof input !== "object" || input === null || Array.isArray(input)) return fail("not-an-object", null, sourceRef);

  const { url, complete, sections, extractions } = input;

  const eu = validUrl(url);
  if (eu) return fail(eu === "control-char" ? "control-char" : "bad-url", null, sourceRef);

  if (typeof complete !== "boolean") return fail("bad-complete", null, sourceRef);

  if (!Array.isArray(sections) || sections.length === 0 || sections.length > SECTIONS_CAP) {
    return fail("bad-sections", null, sourceRef);
  }
  const names = new Set();
  const statusByName = {};
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (typeof s !== "object" || s === null || Array.isArray(s)) return fail("bad-section-entry", `index ${i}`, sourceRef);
    if (typeof s.name !== "string" || s.name.length === 0 || s.name.length > NAME_CAP) return fail("bad-section-entry", `index ${i}`, sourceRef);
    if (hasCtl(s.name)) return fail("control-char", `sections[${i}].name`, sourceRef);
    if (names.has(s.name)) return fail("duplicate-section", s.name, sourceRef);
    if (!STATUSES.includes(s.status)) return fail("bad-section-entry", `index ${i}`, sourceRef);
    names.add(s.name);
    statusByName[s.name] = s.status;
  }

  const exts = extractions === undefined ? [] : extractions;
  if (!Array.isArray(exts) || exts.length > EXTRACTIONS_CAP) return fail("bad-extractions", null, sourceRef);
  for (let i = 0; i < exts.length; i++) {
    const e = exts[i];
    if (typeof e !== "object" || e === null || Array.isArray(e)) return fail("bad-extraction-entry", `index ${i}`, sourceRef);
    if (!FIELDS.includes(e.field)) return fail("unknown-field", e.field, sourceRef);
    if (typeof e.value !== "string" || e.value.trim().length === 0 || e.value.length > VALUE_CAP) {
      return fail("bad-extraction-entry", `index ${i}`, sourceRef);
    }
    if (hasCtl(e.value)) return fail("control-char", `extractions[${i}].value`, sourceRef);
    if (typeof e.section !== "string" || !names.has(e.section)) return fail("unknown-section", e.section, sourceRef);
    if (statusByName[e.section] === "missing") return fail("extraction-from-missing-section", e.section, sourceRef);
  }

  // marker scan before any claim
  for (let i = 0; i < sections.length; i++) {
    const low = sections[i].name.toLowerCase();
    if (MARKERS.some((m) => low.includes(m))) {
      put("prt_verdict", "quarantine", [{ source: `sections[${i}].name`, locator: "input" }]);
      quar("partial-page-input", `sections[${i}].name`, "active-content", `active-content marker in section name`);
      return R;
    }
  }
  for (let i = 0; i < exts.length; i++) {
    const low = exts[i].value.toLowerCase();
    if (MARKERS.some((m) => low.includes(m))) {
      put("prt_verdict", "quarantine", [{ source: `extractions[${i}].value`, locator: "input" }]);
      quar("partial-page-input", `extractions[${i}].value`, "active-content", `active-content marker in extraction value`);
      return R;
    }
  }

  const allComplete = complete === true && sections.every((s) => s.status === "complete");
  const verdict = allComplete ? "complete" : "partial";

  put("prt_verdict", verdict, [{ source: "classification", locator: "complete + sections[].status" }]);
  put("prt_page_url", url, [{ source: "url", locator: "input.url" }]);

  for (const e of exts) {
    if (statusByName[e.section] === "complete") {
      put(`prt_${e.field}`, e.value, [{ source: e.section, locator: "sections[].extractions" }]);
    } else {
      R.held.push({ field: `prt_${e.field}`, reason: "partial-section-no-guess", section: e.section });
    }
  }
  return R;
}

export function fixtureDigest(input) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
