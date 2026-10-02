#!/usr/bin/env node
// owner-corrections fixture lab, batch 1: case-cor-0..49 (missions ACQ-1551..ACQ-1600).
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-cor-0", "clean name",
  "Baseline accept on the name field.",
  { field: "name", old_value: "Old Name", new_value: "New Name" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-1", "clean phone",
  "Baseline accept on the phone field.",
  { field: "phone", new_value: "+1 (555) 123-4567" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone" } });

add("case-cor-2", "clean hours",
  "Baseline accept on the hours field.",
  { field: "hours", new_value: "Mon-Fri 9-5" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "hours" } });

add("case-cor-3", "clean address",
  "Baseline accept on the address field.",
  { field: "address", new_value: "123 Main St" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "address" } });

add("case-cor-4", "clean https url",
  "Baseline accept on the url field.",
  { field: "url", new_value: "https://example.com" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-5", "clean description",
  "Baseline accept on the description field.",
  { field: "description", new_value: "Family-run shop since 1998." },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-6", "unknown field",
  "Corrections to unknown fields are a typed failure, not a guess.",
  { field: "owner_ssn", new_value: "123-45-6789" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-cor-7", "empty new_value",
  "Empty corrections are rejected.",
  { field: "name", new_value: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-correction" });

add("case-cor-8", "whitespace new_value",
  "Whitespace-only corrections are rejected.",
  { field: "name", new_value: "   " },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-correction" });

add("case-cor-9", "name over cap",
  "201 chars exceeds the 200-char name cap.",
  { field: "name", new_value: "n".repeat(201) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-10", "description over cap",
  "5001 chars exceeds the 5000-char description cap.",
  { field: "description", new_value: "d".repeat(5001) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-11", "script in description",
  "Active content in a description is held.",
  { field: "description", new_value: "Nice shop <script>alert(1)</script>" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-12", "script in name",
  "Active content in a name is held.",
  { field: "name", new_value: "Shop <script>" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-13", "php in url",
  "Marker scan fires before URL parsing.",
  { field: "url", new_value: "https://example.com/<?php" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-14", "url without scheme",
  "Schemes are not guessed: www.example.com fails.",
  { field: "url", new_value: "www.example.com" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-15", "javascript scheme",
  "javascript: URLs are rejected.",
  { field: "url", new_value: "javascript:alert(1)" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-16", "http url",
  "Plain http is acceptable.",
  { field: "url", new_value: "http://example.com/menu" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-17", "uppercase scheme",
  "URL parsing normalizes the scheme.",
  { field: "url", new_value: "HTTP://example.com" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-18", "newline in name",
  "Names must be single-line.",
  { field: "name", new_value: "Shop\nName" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "multiline-value" });

add("case-cor-19", "newline in description",
  "Descriptions may be multiline.",
  { field: "description", new_value: "Line one.\nLine two." },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-20", "newline in url",
  "URLs must be single-line.",
  { field: "url", new_value: "https://example.com\n" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "multiline-value" });

add("case-cor-21", "hostile old clean new",
  "Only the new value is scanned; a clean replacement is accepted.",
  { field: "name", old_value: "Shop <script>", new_value: "Clean Shop" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-22", "no-change correction",
  "Resubmitting the same value is not a failure.",
  { field: "phone", old_value: "555-1234", new_value: "555-1234" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone" } });

add("case-cor-23", "numeric submitter",
  "submitted_by must be a string.",
  { field: "name", new_value: "Shop", submitted_by: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-submitter" });

add("case-cor-24", "submitter over cap",
  "submitted_by over 200 chars is rejected.",
  { field: "name", new_value: "Shop", submitted_by: "s".repeat(201) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-submitter-cap" });

add("case-cor-25", "numeric new_value",
  "new_value must be a string.",
  { field: "name", new_value: 42 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-value" });

add("case-cor-26", "numeric field",
  "field must be a string.",
  { field: 42, new_value: "Shop" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-field" });

add("case-cor-27", "null input",
  "Null is not a correction.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cor-28", "array input",
  "Arrays are not corrections.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cor-29", "capitalized field",
  "Field matching is strict: 'Name' is unknown.",
  { field: "Name", new_value: "Shop" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-cor-30", "url with space",
  "Spaces make the URL unparseable.",
  { field: "url", new_value: "http://exa mple.com" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-31", "script in url path",
  "Marker scan fires before URL parsing.",
  { field: "url", new_value: "https://example.com/<script>" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-32", "phone with letters",
  "No phone format guessing: letters and extensions are accepted.",
  { field: "phone", new_value: "+1 (555) 123-4567 ext 9" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone" } });

add("case-cor-33", "description at cap",
  "Boundary: exactly 5000 chars is accepted.",
  { field: "description", new_value: "d".repeat(5000) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-34", "multiline hours",
  "Hours may be multiline.",
  { field: "hours", new_value: "Mon-Fri 9-5\nSat 10-2" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "hours" } });

add("case-cor-35", "multiline address",
  "Addresses may be multiline.",
  { field: "address", new_value: "123 Main St\nSuite 4" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "address" } });

add("case-cor-36", "quarantine claims no chars",
  "Held corrections never get a char count.",
  { field: "description", new_value: "Nice <iframe>" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine", cor_field: "description" },
    absent_claims: ["cor_chars"] });

add("case-cor-37", "chars exact",
  "The char count is claimed exactly.",
  { field: "name", new_value: "Twelve chars" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_chars: 12 } });

add("case-cor-38", "no old_value",
  "old_value is optional.",
  { field: "name", new_value: "Brand New" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-39", "extra fields ignored",
  "Unknown input fields are not claims and not failures.",
  { field: "name", new_value: "Shop", owner: "x", tags: ["y"] },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-40", "nul in description",
  "NUL bytes are rejected in every field.",
  { field: "description", new_value: "ab\0cd" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cor-41", "nul in name",
  "NUL bytes are rejected in every field.",
  { field: "name", new_value: "ab\0cd" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char" });

add("case-cor-42", "php in phone",
  "Markers fire in the phone field too.",
  { field: "phone", new_value: "555 <?php" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-43", "onerror in address",
  "Event-handler markers fire in the address field.",
  { field: "address", new_value: "123 Main onerror=x" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-44", "iframe in hours",
  "Markers fire in the hours field.",
  { field: "hours", new_value: "9-5 <iframe>" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-45", "url with port",
  "Ports are fine on http URLs.",
  { field: "url", new_value: "http://example.com:8080/x" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-46", "url with query",
  "Query strings are fine.",
  { field: "url", new_value: "https://example.com/a?b=1" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-47", "ftp url",
  "Non-http(s) schemes are rejected.",
  { field: "url", new_value: "ftp://example.com/x" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-48", "empty url",
  "Empty checks run before URL parsing.",
  { field: "url", new_value: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-correction" });

add("case-cor-49", "unicode description",
  "Unicode descriptions are accepted.",
  { field: "description", new_value: "Café con leche y pan dulce." },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

// ---- manifest: missions ACQ-1551..ACQ-1600 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1551 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCorr = manifest;

export { C, manifest, manifestCorr };
export function getCase(id) { return C.find((c) => c.id === id); }
