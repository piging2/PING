#!/usr/bin/env node
// conflict-sources fixture lab, batch 3: case-cfl-100..149 (missions ACQ-1901..ACQ-1950).
// Final wave: check-ordering guarantees and the remaining shape edges.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const S = (source, value, extra) => Object.assign({ source, value }, extra);

add("case-cfl-100", "bad fact beats marker",
  "Check order: fact validation (2) precedes marker scan (5).",
  { fact: "email", sources: [S("a", "x<script>")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-fact" });

add("case-cfl-101", "shape beats marker",
  "Check order: envelope (1) precedes everything.",
  "phone",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cfl-102", "empty beats marker",
  "Check order: sources bounds (3) precede marker scan (5).",
  { fact: "phone", sources: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-sources" });

add("case-cfl-103", "entry shape beats marker",
  "Check order: entry shapes (4) precede marker scan (5).",
  { fact: "phone", sources: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-104", "cap beats marker",
  "Check order: value caps (4) precede marker scan (5).",
  { fact: "name", sources: [S("a", "x".repeat(501) + "<script>")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-cfl-105", "nul beats marker",
  "Check order: NUL check (4) precedes marker scan (5).",
  { fact: "phone", sources: [S("a", "1\0<script>")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cfl-106", "empty value beats marker",
  "Check order: empty check (4) precedes marker scan (5).",
  { fact: "phone", sources: [S("a", "   ")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-107", "source cap beats marker",
  "Check order: source-name caps (4) precede marker scan (5).",
  { fact: "phone", sources: [S("s".repeat(201) + "<script>", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-source-name-cap" });

add("case-cfl-108", "too many beats marker",
  "Check order: sources bounds (3) precede marker scan (5).",
  { fact: "phone", sources: [S("a","1<script>"),S("b","1"),S("c","1"),S("d","1"),S("e","1"),S("f","1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "too-many-sources" });

add("case-cfl-109", "bad sources beats marker",
  "Check order: sources shape (3) precedes marker scan (5).",
  { fact: "phone", sources: "x<script>" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sources" });

add("case-cfl-110", "bad fact type beats marker",
  "Check order: fact type (2) precedes marker scan (5).",
  { fact: 42, sources: [S("a", "x<script>")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-fact" });

add("case-cfl-111", "null input",
  "Null is not a conflict input.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cfl-112", "numeric input",
  "Numbers are not conflict inputs.",
  42,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cfl-113", "missing sources",
  "Sources are required.",
  { fact: "phone" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sources" });

add("case-cfl-114", "missing fact",
  "Fact is required.",
  { sources: [S("a", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-fact" });

add("case-cfl-115", "five unicode agree",
  "Five unicode sources corroborate.",
  { fact: "address", sources: [S("a","Ü 1"),S("b","Ü 1"),S("c","Ü 1"),S("d","Ü 1"),S("e","Ü 1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_source_count: 5 },
    min_provenance: { cfl_value: 5 } });

add("case-cfl-116", "five conflict",
  "Five distinct: 5 candidates.",
  { fact: "name", sources: [S("a","1"),S("b","2"),S("c","3"),S("d","4"),S("e","5")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict", cfl_source_count: 5 },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-117", "single phone uncorroborated",
  "One source: uncorroborated.",
  { fact: "phone", sources: [S("only", "555-1234")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-118", "value with quotes",
  "Quotes are literal content.",
  { fact: "name", sources: [S("a", 'Say "hi"'), S("b", 'Say "hi"')] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: 'Say "hi"' } });

add("case-cfl-119", "backslash differs",
  "Backslashes are literal.",
  { fact: "address", sources: [S("a", "C:\\Main"), S("b", "C:/Main")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-120", "onerror uppercase",
  "Marker scan is case-insensitive.",
  { fact: "hours", sources: [S("a", "9-5 ONERROR=x")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-121", "php uppercase",
  "Marker scan is case-insensitive.",
  { fact: "name", sources: [S("a", "Shop <?PHP")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-122", "iframe mixed",
  "Marker scan is case-insensitive.",
  { fact: "url", sources: [S("a", "https://x.com/"), S("b", "https://x.com/<IfRaMe>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-123", "long agree",
  "Cap-boundary agreement corroborates.",
  { fact: "hours", sources: [S("a", "h".repeat(500)), S("b", "h".repeat(500))] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-124", "long disagree",
  "Cap-boundary disagreement conflicts.",
  { fact: "hours", sources: [S("a", "h".repeat(500)), S("b", "h".repeat(499) + "x")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-125", "source name spaces",
  "Source names may contain spaces.",
  { fact: "phone", sources: [S("my site", "1"), S("the listing", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-126", "source name newline",
  "Newlines are allowed in source names.",
  { fact: "phone", sources: [S("a\nb", "1"), S("c", "1")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-127", "value json",
  "JSON-looking values are literal strings.",
  { fact: "name", sources: [S("a", '{"x":1}'), S("b", '{"x":1}')] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: '{"x":1}' } });

add("case-cfl-128", "value json differs",
  "JSON key order matters: no parsing, literal compare.",
  { fact: "name", sources: [S("a", '{"x":1,"y":2}'), S("b", '{"y":2,"x":1}')] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-129", "kitchen sink quarantine",
  "Markers beat agreement.",
  { fact: "phone", sources: [S("a", "1"), S("b", "1"), S("c", "1<script>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-130", "kitchen sink agree",
  "Four agreeing with extras and unicode.",
  { fact: "name", sources: [S("s1","Ünï",{t:1}),S("s2","Ünï",{t:2}),S("s3","Ünï",{t:3}),S("s4","Ünï",{t:4})] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_source_count: 4 },
    min_provenance: { cfl_value: 4 } });

add("case-cfl-131", "kitchen sink conflict",
  "Unicode vs ascii conflict.",
  { fact: "address", sources: [S("a", "Straße"), S("b", "Strasse"), S("c", "STRASSE")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-132", "zero-width differs",
  "Invisible characters break agreement: no normalization.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop​")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-133", "single emoji",
  "Single-source emoji: uncorroborated.",
  { fact: "name", sources: [S("a", "\u{1F600}")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-134", "empty string value",
  "Empty values are rejected.",
  { fact: "name", sources: [S("a", "")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-135", "entry missing both",
  "Empty entries fail the shape check.",
  { fact: "phone", sources: [{}] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-136", "value undefined",
  "Undefined values fail the string check.",
  { fact: "phone", sources: [{ source: "a" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-137", "source undefined",
  "Undefined source names fail the string check.",
  { fact: "phone", sources: [{ value: "1" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-138", "three agree url",
  "Three agreeing URLs corroborate.",
  { fact: "url", sources: [S("a","https://x.com/a"),S("b","https://x.com/a"),S("c","https://x.com/a")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "https://x.com/a" },
    min_provenance: { cfl_value: 3 } });

add("case-cfl-139", "conflict trailing slash",
  "Trailing slashes matter: literal compare.",
  { fact: "url", sources: [S("a", "https://x.com"), S("b", "https://x.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-140", "marker only second",
  "Second-source markers still hold.",
  { fact: "phone", sources: [S("a", "1"), S("b", "2"), S("c", "3"), S("d", "4"), S("e", "5<script>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-141", "nul in second",
  "NUL check covers every source.",
  { fact: "phone", sources: [S("a", "1"), S("b", "2\0" + "3")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cfl-142", "whitespace source name",
  "Whitespace-only source names fail.",
  { fact: "phone", sources: [S("   ", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-143", "numeric source name",
  "Source names must be strings.",
  { fact: "phone", sources: [{ source: 7, value: "1" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-144", "final agree",
  "Closing accept: address, two sources.",
  { fact: "address", sources: [S("a", "1 Main St"), S("b", "1 Main St")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "1 Main St" } });

add("case-cfl-145", "final conflict",
  "Closing conflict: phone, two sources.",
  { fact: "phone", sources: [S("a", "1"), S("b", "2")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-146", "final uncorroborated",
  "Closing uncorroborated: single name source.",
  { fact: "name", sources: [S("solo", "Lone Shop")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"], required_unresolved: ["cfl_value"] });

add("case-cfl-147", "final quarantine",
  "Closing quarantine: marker in hours.",
  { fact: "hours", sources: [S("a", "9-5"), S("b", "9-5<iframe>")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-148", "final typed failure",
  "Closing typed failure: unknown fact.",
  { fact: "fax", sources: [S("a", "1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-fact" });

add("case-cfl-149", "final shape failure",
  "Closing shape failure: sources not an array.",
  { fact: "phone", sources: { a: "1" } },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sources" });

// ---- manifest: missions ACQ-1901..ACQ-1950 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1901 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCfl3 = manifest;

export { C, manifest, manifestCfl3 };
export function getCase(id) { return C.find((c) => c.id === id); }
