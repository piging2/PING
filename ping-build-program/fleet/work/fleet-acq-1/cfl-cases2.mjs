#!/usr/bin/env node
// conflict-sources fixture lab, batch 2: case-cfl-50..99 (missions ACQ-1851..ACQ-1900).
// Second wave: per-fact agree/disagree matrix, candidate grouping, source-name
// edges, and unicode normalization boundaries.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const S = (source, value, extra) => Object.assign({ source, value }, extra);

add("case-cfl-50", "name agrees",
  "Per-fact matrix: name.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "Shop" } });

add("case-cfl-51", "name disagrees",
  "Per-fact matrix: name.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Store")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-52", "phone agrees",
  "Per-fact matrix: phone.",
  { fact: "phone", sources: [S("a", "1"), S("b", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "1" } });

add("case-cfl-53", "phone disagrees",
  "Per-fact matrix: phone.",
  { fact: "phone", sources: [S("a", "1"), S("b", "2")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-54", "hours agrees",
  "Per-fact matrix: hours.",
  { fact: "hours", sources: [S("a", "9-5"), S("b", "9-5")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "9-5" } });

add("case-cfl-55", "hours disagrees",
  "Per-fact matrix: hours.",
  { fact: "hours", sources: [S("a", "9-5"), S("b", "10-6")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-56", "address agrees",
  "Per-fact matrix: address.",
  { fact: "address", sources: [S("a", "1 Main"), S("b", "1 Main")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "1 Main" } });

add("case-cfl-57", "address disagrees",
  "Per-fact matrix: address.",
  { fact: "address", sources: [S("a", "1 Main"), S("b", "2 Main")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-58", "url agrees",
  "Per-fact matrix: url.",
  { fact: "url", sources: [S("a", "https://x.com/"), S("b", "https://x.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "https://x.com/" } });

add("case-cfl-59", "url disagrees",
  "Per-fact matrix: url.",
  { fact: "url", sources: [S("a", "https://x.com/"), S("b", "https://y.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-60", "observed_at differs",
  "Extras do not affect corroboration.",
  { fact: "phone", sources: [S("a", "1", { observed_at: "t1" }), S("b", "1", { observed_at: "t2" })] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "1" } });

add("case-cfl-61", "grouped candidates",
  "4 sources, AABB: 2 candidates.",
  { fact: "name", sources: [S("a","X"),S("b","X"),S("c","Y"),S("d","Y")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict", cfl_source_count: 4 },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-62", "single name",
  "Uncorroborated name.",
  { fact: "name", sources: [S("a", "Shop")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-63", "single url",
  "Uncorroborated url.",
  { fact: "url", sources: [S("a", "https://x.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-64", "single hours",
  "Uncorroborated hours.",
  { fact: "hours", sources: [S("a", "9-5")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-65", "single address",
  "Uncorroborated address.",
  { fact: "address", sources: [S("a", "1 Main")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-66", "source name at cap",
  "Boundary: exactly 200 chars is accepted.",
  { fact: "phone", sources: [S("s".repeat(200), "1"), S("b", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-67", "source name over cap",
  "201 chars exceeds the 200-char source-name cap.",
  { fact: "phone", sources: [S("s".repeat(201), "1"), S("b", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-source-name-cap" });

add("case-cfl-68", "unicode normalization",
  "No unicode normalization: é (U+00E9) vs e + combining accent conflict.",
  { fact: "name", sources: [S("a", "Café"), S("b", "Café")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-69", "five agree unicode",
  "Five unicode sources corroborate with depth 5.",
  { fact: "name", sources: [S("a","Ünï"),S("b","Ünï"),S("c","Ünï"),S("d","Ünï"),S("e","Ünï")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_source_count: 5 },
    min_provenance: { cfl_value: 5 } });

add("case-cfl-70", "marker in fifth",
  "Marker scan covers all five sources.",
  { fact: "phone", sources: [S("a","1"),S("b","1"),S("c","1"),S("d","1"),S("e","1<script>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-71", "over cap second",
  "Cap check covers every source.",
  { fact: "phone", sources: [S("a", "1"), S("b", "x".repeat(501))] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-cfl-72", "nul in source name",
  "NUL check covers source names.",
  { fact: "phone", sources: [S("a\0b", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cfl-73", "marker in source name",
  "Source names are scanned for markers too.",
  { fact: "phone", sources: [S("<script>", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-74", "triple agree phone",
  "Three agreeing phones corroborate.",
  { fact: "phone", sources: [S("a","1"),S("b","1"),S("c","1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_source_count: 3 },
    min_provenance: { cfl_value: 3 } });

add("case-cfl-75", "conflict unicode",
  "Unicode disagreement: conflict.",
  { fact: "address", sources: [S("a", "Straße 1"), S("b", "Strasse 1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-76", "tab differs",
  "Tab vs space: conflict, no whitespace normalization.",
  { fact: "name", sources: [S("a", "A\tB"), S("b", "A B")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-77", "crlf vs lf",
  "CRLF vs LF: conflict.",
  { fact: "hours", sources: [S("a", "9-5\r\n"), S("b", "9-5\n")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-78", "empty value second",
  "Empty values fail anywhere in the list.",
  { fact: "name", sources: [S("a", "Shop"), S("b", " ")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-79", "numeric source name",
  "Source names must be strings.",
  { fact: "phone", sources: [S(42, "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-80", "entry array",
  "Entries must be objects.",
  { fact: "phone", sources: [["a", "1"]] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-81", "entry string",
  "Entries must be objects.",
  { fact: "phone", sources: ["a"] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-82", "five conflict",
  "Five distinct: 5 candidates.",
  { fact: "hours", sources: [S("a","1"),S("b","2"),S("c","3"),S("d","4"),S("e","5")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict", cfl_source_count: 5 },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-83", "four agree one differs",
  "4v1: 2 candidates.",
  { fact: "phone", sources: [S("a","1"),S("b","1"),S("c","1"),S("d","1"),S("e","2")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-84", "onload in value",
  "Event-handler markers fire.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop onload=x")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-85", "php in source name",
  "Source names are scanned.",
  { fact: "phone", sources: [S("a<?php", "1"), S("b", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-86", "iframe uppercase",
  "Marker scan is case-insensitive.",
  { fact: "address", sources: [S("a", "1 <IFRAME>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-87", "long unicode agree",
  "Long unicode values corroborate.",
  { fact: "name", sources: [S("a", "ü".repeat(500)), S("b", "ü".repeat(500))] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-88", "emoji conflict",
  "Emoji difference is a conflict.",
  { fact: "name", sources: [S("a", "Shop \u{1F600}"), S("b", "Shop \u{1F601}")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-89", "kitchen sink agree",
  "Five agreeing with extras.",
  { fact: "url", sources: [S("a","https://x.com/",{t:1}),S("b","https://x.com/",{t:2}),S("c","https://x.com/",{t:3}),S("d","https://x.com/",{t:4}),S("e","https://x.com/",{t:5})] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_source_count: 5 },
    min_provenance: { cfl_value: 5 } });

add("case-cfl-90", "kitchen sink conflict",
  "Split sources with extras.",
  { fact: "phone", sources: [S("a","1",{t:1}),S("b","2",{t:2}),S("c","1",{t:3})] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-91", "source name unicode",
  "Unicode source names are fine.",
  { fact: "phone", sources: [S("sïte", "1"), S("lïsting", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-92", "value zero string",
  "'0' is a non-empty value.",
  { fact: "phone", sources: [S("a", "0"), S("b", "0")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "0" } });

add("case-cfl-93", "benign html agrees",
  "Benign HTML is not a marker.",
  { fact: "name", sources: [S("a", "<b>Shop</b>"), S("b", "<b>Shop</b>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "<b>Shop</b>" } });

add("case-cfl-94", "split marker agrees",
  "Split markers are not markers.",
  { fact: "name", sources: [S("a", "<scr ipt>"), S("b", "<scr ipt>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "<scr ipt>" } });

add("case-cfl-95", "duplicate values same source",
  "Identical duplicates corroborate.",
  { fact: "phone", sources: [S("a", "1"), S("a", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "1", cfl_source_count: 2 } });

add("case-cfl-96", "three sources two values",
  "AAB: 2 candidates.",
  { fact: "hours", sources: [S("a","9-5"),S("b","9-5"),S("c","10-6")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-97", "conflict then marker",
  "Marker scan runs on all entries regardless of agreement.",
  { fact: "phone", sources: [S("a", "1"), S("b", "2"), S("c", "3<script>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-98", "url case differs",
  "URLs are compared literally: case differs, conflict.",
  { fact: "url", sources: [S("a", "https://X.com/"), S("b", "https://x.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-99", "final agree",
  "Closing accept: two sources, hours.",
  { fact: "hours", sources: [S("a", "Mon-Fri 9-5"), S("b", "Mon-Fri 9-5")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "Mon-Fri 9-5" } });

// ---- manifest: missions ACQ-1851..ACQ-1900 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1851 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCfl2 = manifest;

export { C, manifest, manifestCfl2 };
export function getCase(id) { return C.find((c) => c.id === id); }
