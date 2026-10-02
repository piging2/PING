#!/usr/bin/env node
// conflict-sources fixture lab, batch 1: case-cfl-0..49 (missions ACQ-1801..ACQ-1850).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });
const S = (source, value, extra) => Object.assign({ source, value }, extra);

add("case-cfl-0", "phone agrees",
  "Two identical values corroborate.",
  { fact: "phone", sources: [S("site", "555-1234"), S("listing", "555-1234")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "corroborated", cfl_fact: "phone", cfl_value: "555-1234", cfl_source_count: 2 },
    min_provenance: { cfl_value: 2 } });

add("case-cfl-1", "hours triple agree",
  "Three identical values corroborate with depth 3.",
  { fact: "hours", sources: [S("a", "9-5"), S("b", "9-5"), S("c", "9-5")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "corroborated", cfl_source_count: 3 },
    min_provenance: { cfl_value: 3 } });

add("case-cfl-2", "phone disagrees",
  "Two different values: conflict, no value claimed.",
  { fact: "phone", sources: [S("site", "555-1234"), S("listing", "555-9999")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict", cfl_fact: "phone" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-3", "two against one",
  "Candidates group by value: 2 candidates.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop"), S("c", "Shoppe")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-4", "three-way split",
  "Three distinct values: 3 candidates.",
  { fact: "address", sources: [S("a", "1 Main"), S("b", "2 Main"), S("c", "3 Main")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-5", "single source",
  "One source cannot corroborate: no value claimed.",
  { fact: "phone", sources: [S("site", "555-1234")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "uncorroborated" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-6", "unknown fact",
  "Unsupported facts are a typed failure.",
  { fact: "email", sources: [S("a", "x")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-fact" });

add("case-cfl-7", "numeric fact",
  "Fact must be a string.",
  { fact: 42, sources: [S("a", "x")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-fact" });

add("case-cfl-8", "sources not array",
  "Sources must be an array.",
  { fact: "phone", sources: "x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sources" });

add("case-cfl-9", "empty sources",
  "At least one source is required.",
  { fact: "phone", sources: [] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-sources" });

add("case-cfl-10", "six sources",
  "At most 5 sources per fact.",
  { fact: "phone", sources: [S("a","1"),S("b","1"),S("c","1"),S("d","1"),S("e","1"),S("f","1")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "too-many-sources" });

add("case-cfl-11", "five agree",
  "Boundary: exactly 5 sources is accepted.",
  { fact: "url", sources: [S("a","https://x.com/"),S("b","https://x.com/"),S("c","https://x.com/"),S("d","https://x.com/"),S("e","https://x.com/")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "corroborated", cfl_source_count: 5 },
    min_provenance: { cfl_value: 5 } });

add("case-cfl-12", "entry missing value",
  "Entries need a value.",
  { fact: "phone", sources: [{ source: "a" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-13", "entry missing source",
  "Entries need a source name.",
  { fact: "phone", sources: [{ value: "1" }] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-14", "null entry",
  "Entries must be objects.",
  { fact: "phone", sources: [null] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-15", "empty value",
  "Empty values are rejected.",
  { fact: "phone", sources: [S("a", "")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-16", "value over cap",
  "501 chars exceeds the 500-char value cap.",
  { fact: "name", sources: [S("a", "n".repeat(501))] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-value-cap" });

add("case-cfl-17", "value at cap",
  "Boundary: exactly 500 chars is accepted.",
  { fact: "name", sources: [S("a", "n".repeat(500)), S("b", "n".repeat(500))] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated" } });

add("case-cfl-18", "nul in value",
  "NUL bytes are rejected.",
  { fact: "phone", sources: [S("a", "12\0" + "3")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cfl-19", "marker in value",
  "Active content is held.",
  { fact: "name", sources: [S("a", "Nice <script>")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-20", "marker in one of two",
  "Marker scan fires before corroboration.",
  { fact: "phone", sources: [S("a", "555-1234"), S("b", "555-<iframe>")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-21", "numeric value",
  "Values must be strings.",
  { fact: "phone", sources: [S("a", 42)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-22", "same source twice",
  "No dedup guessing: same name, different values still conflict.",
  { fact: "phone", sources: [S("site", "555-1234"), S("site", "555-9999")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-23", "extra fields ignored",
  "observed_at and friends are not claims.",
  { fact: "phone", sources: [S("a", "555-1234", { observed_at: "2026-01-01" }), S("b", "555-1234", { observed_at: "2026-02-01" })] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "555-1234" } });

add("case-cfl-24", "unicode agrees",
  "Unicode values corroborate.",
  { fact: "name", sources: [S("a", "Café El Sol"), S("b", "Café El Sol")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "Café El Sol" } });

add("case-cfl-25", "case differs",
  "No case folding: 'Shop' vs 'shop' conflict.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "shop")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-26", "trailing space",
  "No trimming: 'Shop' vs 'Shop ' conflict.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop ")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-27", "source count exact",
  "The source count is claimed exactly.",
  { fact: "hours", sources: [S("a", "9-5"), S("b", "9-6"), S("c", "9-7")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict", cfl_source_count: 3 },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-28", "quarantine claims",
  "Held facts still identify the fact.",
  { fact: "hours", sources: [S("a", "9-5 <?php")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine", cfl_fact: "hours" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-29", "url agrees",
  "URL facts corroborate.",
  { fact: "url", sources: [S("a", "https://x.com/"), S("b", "https://x.com/")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "https://x.com/" } });

add("case-cfl-30", "name agrees",
  "Name facts corroborate.",
  { fact: "name", sources: [S("a", "Shop"), S("b", "Shop")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "Shop" } });

add("case-cfl-31", "address disagrees",
  "Address facts conflict.",
  { fact: "address", sources: [S("a", "1 Main"), S("b", "1 Main St")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-32", "whitespace value",
  "Whitespace-only values are rejected.",
  { fact: "phone", sources: [S("a", "   ")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-33", "boolean value",
  "Booleans are not strings.",
  { fact: "phone", sources: [S("a", true)] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-34", "null sources",
  "Sources must be an array.",
  { fact: "phone", sources: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-sources" });

add("case-cfl-35", "empty fact",
  "Empty fact names are unknown.",
  { fact: "", sources: [S("a", "x")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-fact" });

add("case-cfl-36", "null fact",
  "Fact must be a string.",
  { fact: null, sources: [S("a", "x")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-fact" });

add("case-cfl-37", "array input",
  "Arrays are not conflict inputs.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cfl-38", "string input",
  "Strings are not conflict inputs.",
  "phone",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cfl-39", "two against two",
  "Candidates group: 2 candidates from 4 sources.",
  { fact: "phone", sources: [S("a","1"),S("b","1"),S("c","2"),S("d","2")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict", cfl_source_count: 4 },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-40", "five-way split",
  "Five distinct values: 5 candidates.",
  { fact: "phone", sources: [S("a","1"),S("b","2"),S("c","3"),S("d","4"),S("e","5")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict", cfl_source_count: 5 },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-41", "uppercase marker",
  "Marker scan is case-insensitive.",
  { fact: "name", sources: [S("a", "Shop <SCRIPT>")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-42", "onerror in value",
  "Event-handler markers fire.",
  { fact: "address", sources: [S("a", "1 Main"), S("b", "2 Main onerror=x")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-43", "newlines agree",
  "Newlines are compared literally.",
  { fact: "hours", sources: [S("a", "Mon\nTue"), S("b", "Mon\nTue")] },
  { outcome: "bounded_success", claims: { cfl_verdict: "corroborated", cfl_value: "Mon\nTue" } });

add("case-cfl-44", "long values disagree",
  "Cap-boundary values can still conflict.",
  { fact: "name", sources: [S("a", "n".repeat(500)), S("b", "m".repeat(500))] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

add("case-cfl-45", "single source marker",
  "Marker scan fires before corroboration logic.",
  { fact: "phone", sources: [S("a", "555-<script>")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "quarantine" },
    required_quarantined: [{ property: "conflict-source-value", reason: "active-content" }] });

add("case-cfl-46", "one empty of two",
  "Empty values fail even when a sibling is fine.",
  { fact: "phone", sources: [S("a", "555-1234"), S("b", "")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-source-value" });

add("case-cfl-47", "empty source name",
  "Source names must be non-empty.",
  { fact: "phone", sources: [S("", "555-1234")] },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-source-entry" });

add("case-cfl-48", "kitchen sink agree",
  "Extras plus three agreeing sources.",
  { fact: "address", sources: [S("a","1 Main",{n:1}),S("b","1 Main",{n:2}),S("c","1 Main",{n:3})] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "corroborated", cfl_value: "1 Main", cfl_source_count: 3 },
    min_provenance: { cfl_value: 3 } });

add("case-cfl-49", "kitchen sink conflict",
  "Unicode disagreement: conflict, no value claimed.",
  { fact: "name", sources: [S("a", "Café"), S("b", "Cafe")] },
  { outcome: "bounded_success",
    claims: { cfl_verdict: "conflict" },
    absent_claims: ["cfl_value"],
    required_unresolved: ["cfl_value"] });

// ---- manifest: missions ACQ-1801..ACQ-1850 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1801 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCfl = manifest;

export { C, manifest, manifestCfl };
export function getCase(id) { return C.find((c) => c.id === id); }
