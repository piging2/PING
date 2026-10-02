#!/usr/bin/env node
// js-heavy fixture lab, batch 2: case-jsh-50..99 (missions ACQ-2201..ACQ-2250).
// Second wave: check-ordering, per-field rendered/held matrix, verdict edges.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const F = (field, value, rendered_by_js) => ({ field, value, rendered_by_js });

add("case-jsh-50", "url beats marker",
  "Check order: URL (2) precedes marker scan (5).",
  { url: "notaurl<script>", js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-jsh-51", "booleans beat marker",
  "Check order: booleans (3) precede marker scan (5).",
  { url: "https://x.com/a", js_enabled: "yes", render_complete: true,
    dom_fields: [F("title", "T<script>", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-js-enabled" });

add("case-jsh-52", "shape beats marker",
  "Check order: dom_fields shape (4) precedes marker scan (5).",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("email", "a<script>", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-jsh-53", "value cap beats marker",
  "Check order: value caps (4) precede marker scan (5).",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "v".repeat(501) + "<script>", true)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-54", "nul beats marker",
  "Check order: NUL check (4) precedes marker scan (5).",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "a\0<script>", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-jsh-55", "field title rendered",
  "Per-field matrix: rendered title.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T" },
    min_provenance: { jsh_title: 1 } });

add("case-jsh-56", "field phone rendered",
  "Per-field matrix: rendered phone.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("phone", "555", true)] },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered", jsh_phone: "555" } });

add("case-jsh-57", "field hours rendered",
  "Per-field matrix: rendered hours.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("hours", "9-5", true)] },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered", jsh_hours: "9-5" } });

add("case-jsh-58", "field address rendered",
  "Per-field matrix: rendered address.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("address", "1 Main", true)] },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered", jsh_address: "1 Main" } });

add("case-jsh-59", "field url rendered",
  "Per-field matrix: rendered url.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("url", "https://x.com/b", true)] },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered", jsh_url: "https://x.com/b" } });

add("case-jsh-60", "held title incomplete",
  "Held matrix: title held under render-incomplete.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "T", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete" }, absent_claims: ["jsh_title"] });

add("case-jsh-61", "held phone static",
  "Held matrix: phone held under static-only.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("phone", "555", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_phone"] });

add("case-jsh-62", "held hours incomplete",
  "Held matrix: hours held under render-incomplete.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("hours", "9-5", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete" }, absent_claims: ["jsh_hours"] });

add("case-jsh-63", "held address static",
  "Held matrix: address held under static-only.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("address", "1 Main", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_address"] });

add("case-jsh-64", "held url incomplete",
  "Held matrix: url held under render-incomplete.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("url", "https://x.com/b", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete" }, absent_claims: ["jsh_url"] });

add("case-jsh-65", "static claims static",
  "Static fields claim even when siblings are JS-rendered.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "T", false), F("phone", "P", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_title: "T", jsh_phone: "P" } });

add("case-jsh-66", "rendered static provenance",
  "Static fields carry static-dom provenance.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T" },
    min_provenance: { jsh_title: 1 } });

add("case-jsh-67", "js off render true",
  "js_enabled=false with render_complete=true: static-only.",
  { url: "https://x.com/a", js_enabled: false, render_complete: true,
    dom_fields: [F("title", "T", true), F("phone", "P", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_phone: "P" },
    absent_claims: ["jsh_title"] });

add("case-jsh-68", "long static agree",
  "Cap-boundary static value claims.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("address", "a".repeat(500), false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_address: "a".repeat(500) } });

add("case-jsh-69", "long js held",
  "Cap-boundary JS value holds under static-only.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("address", "a".repeat(500), true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_address"] });

add("case-jsh-70", "onload held field",
  "Markers fire even on held fields.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T onload=x", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-71", "iframe static",
  "Iframe markers fire on static fields.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T <IFRAME>", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-72", "unicode held",
  "Unicode JS values hold under render-incomplete.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "Café", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete" }, absent_claims: ["jsh_title"] });

add("case-jsh-73", "unicode static",
  "Unicode static values claim.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "Café", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_title: "Café" } });

add("case-jsh-74", "empty dom_fields",
  "Explicit empty array: rendered verdict, no fields.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered" }, absent_claims: ["jsh_title"] });

add("case-jsh-75", "null input",
  "Null is not an observation.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-jsh-76", "numeric input",
  "Numbers are not observations.",
  42,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-jsh-77", "missing url",
  "url is required.",
  { js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-jsh-78", "ftp url",
  "Only HTTP(S) is accepted.",
  { url: "ftp://x.com/a", js_enabled: true, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-url" });

add("case-jsh-79", "entry missing value",
  "Entries need values.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [{ field: "title", rendered_by_js: false }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-80", "entry missing field",
  "Entries need fields.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [{ value: "T", rendered_by_js: false }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-jsh-81", "entry string",
  "Entries must be objects.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: ["title"] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-82", "js_enabled null",
  "js_enabled must be a boolean.",
  { url: "https://x.com/a", js_enabled: null, render_complete: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-js-enabled" });

add("case-jsh-83", "render_complete missing",
  "render_complete is required.",
  { url: "https://x.com/a", js_enabled: true, dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-render-complete" });

add("case-jsh-84", "kitchen sink rendered",
  "Full rendered observation with extras.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true, at: "t",
    dom_fields: [F("title", "T", true), F("phone", "P", false), F("hours", "H", true),
                 F("address", "A", false), F("url", "https://x.com/u", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T", jsh_phone: "P",
              jsh_hours: "H", jsh_address: "A", jsh_url: "https://x.com/u" } });

add("case-jsh-85", "kitchen sink static",
  "Full static observation: JS fields held.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "T", true), F("phone", "P", false), F("hours", "H", true),
                 F("address", "A", false), F("url", "https://x.com/u", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only", jsh_phone: "P", jsh_address: "A" },
    absent_claims: ["jsh_title", "jsh_hours", "jsh_url"] });

add("case-jsh-86", "kitchen sink incomplete",
  "Full incomplete observation: JS fields held.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("title", "T", true), F("phone", "P", false), F("hours", "H", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_phone: "P" },
    absent_claims: ["jsh_title", "jsh_hours"] });

add("case-jsh-87", "kitchen sink quarantine",
  "Marker in a static field quarantines.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true), F("phone", "P <?php", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-88", "value zero string",
  "'0' is a non-empty value.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("phone", "0", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_phone: "0" } });

add("case-jsh-89", "value newlines",
  "Newlines are control characters: rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("hours", "Mon\nTue", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-jsh-90", "tab in value",
  "Tabs are control characters: rejected.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "A\tB", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-jsh-91", "url at cap",
  "Boundary: 2000-char URL accepted.",
  { url: "https://x.com/" + "a".repeat(1986), js_enabled: true, render_complete: true,
    dom_fields: [] },
  { outcome: "bounded_success", claims: { jsh_verdict: "rendered" } });

add("case-jsh-92", "idn url",
  "Unicode hosts are valid observations.",
  { url: "https://münchen.de/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "T" } });

add("case-jsh-93", "final accept",
  "Closing accept: rendered.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "Fin", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "rendered", jsh_title: "Fin" } });

add("case-jsh-94", "final held",
  "Closing held: static-only.",
  { url: "https://x.com/a", js_enabled: false, render_complete: false,
    dom_fields: [F("title", "Fin", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "static-only" }, absent_claims: ["jsh_title"] });

add("case-jsh-95", "final incomplete",
  "Closing verdict: render-incomplete.",
  { url: "https://x.com/a", js_enabled: true, render_complete: false,
    dom_fields: [F("phone", "555", false)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "render-incomplete", jsh_phone: "555" } });

add("case-jsh-96", "final quarantine",
  "Closing quarantine.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("title", "T", true), F("address", "A<script>", true)] },
  { outcome: "bounded_success",
    claims: { jsh_verdict: "quarantine" },
    required_quarantined: [{ property: "js-render-input", reason: "active-content" }] });

add("case-jsh-97", "final typed failure",
  "Closing typed failure: unknown field.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [F("fax", "1", false)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-jsh-98", "final shape failure",
  "Closing shape failure: null entry.",
  { url: "https://x.com/a", js_enabled: true, render_complete: true,
    dom_fields: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field-entry" });

add("case-jsh-99", "final boolean failure",
  "Closing typed failure: render_complete wrong type.",
  { url: "https://x.com/a", js_enabled: false, render_complete: "no", dom_fields: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-render-complete" });

// ---- manifest: missions ACQ-2201..ACQ-2250 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(2201 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestJsh2 = manifest;

export { C, manifest, manifestJsh2 };
export function getCase(id) { return C.find((c) => c.id === id); }
