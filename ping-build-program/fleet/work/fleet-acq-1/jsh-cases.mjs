#!/usr/bin/env node
// js-heavy fixture lab, batch 1: case-jsh-0..49 (missions ACQ-2151..ACQ-2200).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const F = (field, value, rendered_by_js) => ({ field, value, rendered_by_js });

add("case-jsh-0", "fully rendered",
  "JS on and complete: all fields claimed.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Shop", true), F("phone", "555", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Shop", jsh_phone: "555" } });

add("case-jsh-1", "static only",
  "JS off: static fields claimed, JS fields held.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "Static", false), F("phone", "555", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_title: "Static" },
    absent_claims: ["jsh_phone"] });

add("case-jsh-2", "render incomplete",
  "JS on but incomplete: JS fields held.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "Maybe", true), F("hours", "9-5", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_hours: "9-5" },
    absent_claims: ["jsh_title"] });

add("case-jsh-3", "all static no js",
  "Static page, JS off: everything claimed.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T", false), F("phone", "P", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_title: "T", jsh_phone: "P" } });

add("case-jsh-4", "no fields",
  "Rendered page with zero fields.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_page_url: "https://x.com/a" },
    absent_claims: ["jsh_title"] });

add("case-jsh-5", "all js held",
  "JS off, all fields JS-rendered: nothing claimed but verdict.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T", true), F("phone", "P", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" },
    absent_claims: ["jsh_title", "jsh_phone"] });

add("case-jsh-6", "not an object",
  "Arrays are not observations.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-jsh-7", "bad url",
  "URLs must be absolute HTTP(S).",
  { url: "/rel", js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-jsh-8", "bad js_enabled",
  "js_enabled must be a boolean.",
  { url: "https://x.com/a", js_enabled: "yes", render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-js-enabled" });

add("case-jsh-9", "bad render_complete",
  "render_complete must be a boolean.",
  { url: "https://x.com/a", js_enabled: true, render_complete: 1, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-render-complete" });

add("case-jsh-10", "dom_fields not array",
  "dom_fields must be an array.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true, dom_fields: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-dom-fields" });

add("case-jsh-11", "too many fields",
  "At most 50 fields.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: Array.from({ length: 51 }, (_, i) => F("title", "T" + i, false)) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-dom-fields" });

add("case-jsh-12", "fifty fields",
  "Boundary: exactly 50 fields is accepted.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: Array.from({ length: 50 }, (_, i) => F("title", "T" + i, false)) },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered" } });

add("case-jsh-13", "unknown field",
  "Fields outside the allowlist are typed failures.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("email", "a@b.c", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-jsh-14", "empty value",
  "Empty values are rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-15", "whitespace value",
  "Whitespace-only values are rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "  ", true)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-16", "value over cap",
  "501-char values are rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "v".repeat(501), false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-17", "value at cap",
  "Boundary: exactly 500 chars is accepted.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "v".repeat(500), true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "v".repeat(500) } });

add("case-jsh-18", "nul in value",
  "NUL bytes are rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "a\0b", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-jsh-19", "bad rendered flag",
  "rendered_by_js must be a boolean.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [{ field: "title", value: "T" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-20", "null entry",
  "Entries must be objects.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-21", "marker in value",
  "Active content quarantines.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Shop <script>", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-22", "marker in js value",
  "JS-rendered values are scanned too.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Shop <iframe>", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-23", "uppercase marker",
  "Marker scan is case-insensitive.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("hours", "9-5 <SCRIPT>", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-24", "onerror marker",
  "Event-handler markers fire.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("address", "1 Main onerror=x", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-25", "benign html",
  "Benign HTML is not a marker.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "<b>Shop</b>", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "<b>Shop</b>" } });

add("case-jsh-26", "all fields rendered",
  "Every allowlisted field extracts under full render.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true), F("phone", "P", true), F("hours", "H", true),
                 F("address", "A", true), F("url", "https://x.com/u", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T", jsh_phone: "P",
              jsh_hours: "H", jsh_address: "A", jsh_url: "https://x.com/u" } });

add("case-jsh-27", "mixed held",
  "JS off: static claims, JS holds.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T", false), F("phone", "P", true), F("hours", "H", false),
                 F("address", "A", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_title: "T", jsh_hours: "H" },
    absent_claims: ["jsh_phone", "jsh_address"] });

add("case-jsh-28", "incomplete mixed",
  "Render incomplete: static claims, JS holds.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "T", false), F("phone", "P", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_title: "T" },
    absent_claims: ["jsh_phone"] });

add("case-jsh-29", "unicode values",
  "Unicode values extract.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Café Ünï", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Café Ünï" } });

add("case-jsh-30", "extra fields ignored",
  "Unknown entry fields are ignored.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [{ field: "title", value: "T", rendered_by_js: false, at: "t" }] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T" } });

add("case-jsh-31", "url over cap",
  "2001-char URLs are rejected.",
  { url: "https://x.com/" + "a".repeat(1990), js_enabled: true, render_complete: true,
    dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-jsh-32", "nul in url",
  "NUL in URLs is rejected.",
  { url: "https://x.com/a\0b", js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-jsh-33", "numeric value",
  "Values must be strings.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("phone", 42, false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-34", "php marker",
  "PHP markers fire.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T <?php", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-35", "split marker",
  "Split markers are not markers.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "<scr ipt>", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "<scr ipt>" } });

add("case-jsh-36", "zero-width value",
  "Invisible characters are literal content.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Shop​", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Shop​" } });

add("case-jsh-37", "emoji held",
  "Emoji values hold like any other.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "Shop \u{1F600}", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_title"] });

add("case-jsh-38", "duplicate field static",
  "Duplicate static fields: first wins the lookup.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T1", false), F("title", "T2", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_title: "T1" } });

add("case-jsh-39", "missing js_enabled",
  "js_enabled is required.",
  { url: "https://x.com/a", render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-js-enabled" });

add("case-jsh-40", "missing render_complete",
  "render_complete is required.",
  { url: "https://x.com/a", js_enabled: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-render-complete" });

add("case-jsh-41", "field case",
  "Fields are case-sensitive: 'Title' is unknown.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("Title", "T", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-jsh-42", "value json",
  "JSON-looking values are literal strings.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", '{"t":"x"}', true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: '{"t":"x"}' } });

add("case-jsh-43", "kitchen sink rendered",
  "Full rendered observation.",
  { url: "https://x.com/shop", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Shop", true), F("phone", "555-1234", true),
                 F("hours", "9-5", false), F("address", "1 Main", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Shop", jsh_phone: "555-1234",
              jsh_hours: "9-5", jsh_address: "1 Main" } });

add("case-jsh-44", "kitchen sink static",
  "Full static observation: JS fields held.",
  { url: "https://x.com/shop", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "Shop", true), F("phone", "555-1234", false),
                 F("hours", "9-5", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_phone: "555-1234" },
    absent_claims: ["jsh_title", "jsh_hours"] });

add("case-jsh-45", "kitchen sink incomplete",
  "Full incomplete observation: JS fields held.",
  { url: "https://x.com/shop", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "Shop", true), F("phone", "555-1234", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_phone: "555-1234" },
    absent_claims: ["jsh_title"] });

add("case-jsh-46", "kitchen sink quarantine",
  "Markers beat classification.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true), F("phone", "P<script>", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-47", "final accept",
  "Closing accept: rendered page.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Done", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Done" } });

add("case-jsh-48", "final held",
  "Closing held: static-only with JS field.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("phone", "555", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_phone"] });

add("case-jsh-49", "final typed failure",
  "Closing typed failure: dom_fields not an array.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: { title: "T" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-dom-fields" });

// ---- manifest: missions ACQ-2151..ACQ-2200 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2151 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestJsh = manifest;

export { C, manifest, manifestJsh };
export function getCase(id) { return C.find((c) => c.id === id); }
