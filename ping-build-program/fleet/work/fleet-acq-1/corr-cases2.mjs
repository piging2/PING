#!/usr/bin/env node
// owner-corrections fixture lab, batch 2: case-cor-50..99 (missions ACQ-1601..ACQ-1650).
// Second wave: per-field cap boundaries, URL edge shapes, submitter edges,
// old_value handling, and literal-marker boundaries.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

add("case-cor-50", "phone at cap",
  "Boundary: exactly 40 chars is accepted.",
  { field: "phone", new_value: "1".repeat(40) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone" } });

add("case-cor-51", "phone over cap",
  "41 chars exceeds the 40-char phone cap.",
  { field: "phone", new_value: "1".repeat(41) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-52", "url at cap",
  "Boundary: exactly 500 chars is accepted.",
  { field: "url", new_value: "http://example.com/" + "a".repeat(481) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-53", "url over cap",
  "501 chars exceeds the 500-char url cap.",
  { field: "url", new_value: "http://example.com/" + "a".repeat(482) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-54", "name at cap",
  "Boundary: exactly 200 chars is accepted.",
  { field: "name", new_value: "n".repeat(200) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-55", "hours at cap",
  "Boundary: exactly 500 chars is accepted.",
  { field: "hours", new_value: "h".repeat(500) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "hours" } });

add("case-cor-56", "hours over cap",
  "501 chars exceeds the 500-char hours cap.",
  { field: "hours", new_value: "h".repeat(501) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-57", "address at cap",
  "Boundary: exactly 500 chars is accepted.",
  { field: "address", new_value: "a".repeat(500) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "address" } });

add("case-cor-58", "address over cap",
  "501 chars exceeds the 500-char address cap.",
  { field: "address", new_value: "a".repeat(501) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-field-cap" });

add("case-cor-59", "url with userinfo",
  "Userinfo is legal in a URL: accepted.",
  { field: "url", new_value: "http://user:pass@example.com/" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-60", "scheme-relative url",
  "Scheme-relative URLs have no scheme: rejected.",
  { field: "url", new_value: "//example.com/menu" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-61", "url without slashes",
  "WHATWG normalizes 'http:example.com' to a valid http URL with a host: accepted.",
  { field: "url", new_value: "http:example.com" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-62", "ipv6 url",
  "IPv6 hosts are valid hosts.",
  { field: "url", new_value: "http://[::1]/menu" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-63", "mailto url",
  "mailto: is not http(s): rejected.",
  { field: "url", new_value: "mailto:shop@example.com" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-64", "tel url",
  "tel: is not http(s): rejected.",
  { field: "url", new_value: "tel:+15551234567" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-65", "data url",
  "data: URLs are rejected.",
  { field: "url", new_value: "data:text/plain,hello" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "invalid-url" });

add("case-cor-66", "empty submitter",
  "Empty submitted_by fails the non-empty rule.",
  { field: "name", new_value: "Shop", submitted_by: "" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-submitter" });

add("case-cor-67", "submitter at cap",
  "Boundary: exactly 200 chars is accepted.",
  { field: "name", new_value: "Shop", submitted_by: "s".repeat(200) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-68", "numeric old_value",
  "old_value must be a string when present.",
  { field: "name", old_value: 42, new_value: "Shop" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-old-value" });

add("case-cor-69", "newlines-only description",
  "Trimmed-empty is empty, even in multiline fields.",
  { field: "description", new_value: "\n\n" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-correction" });

add("case-cor-70", "crlf description",
  "CRLF is accepted in multiline fields.",
  { field: "description", new_value: "Line one.\r\nLine two." },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-71", "tab in name",
  "Tabs are not newlines: accepted in single-line fields.",
  { field: "name", new_value: "Shop\tName" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-72", "tab in url",
  "Control characters are rejected: WHATWG would silently strip them, and the gate refuses normalization surprises.",
  { field: "url", new_value: "http://example.com/a\tb" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "control-char-in-url" });

add("case-cor-73", "split marker",
  "Matching is literal: '<scr ipt>' does not match '<script'.",
  { field: "description", new_value: "a <scr ipt> tag" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-74", "unicode name",
  "Unicode names are accepted.",
  { field: "name", new_value: "Café El Sol" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-75", "emoji char count",
  "Char counts use UTF-16 code units: 'a' + emoji = 3.",
  { field: "description", new_value: "a\u{1F600}" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_chars: 3 } });

add("case-cor-76", "uppercase php marker",
  "Marker scan is case-insensitive.",
  { field: "description", new_value: "x <?PHP y" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-77", "uppercase onload",
  "Marker scan is case-insensitive.",
  { field: "hours", new_value: "9-5 ONLOAD=x" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-78", "unicode multiline address",
  "Unicode plus newlines in a multiline field.",
  { field: "address", new_value: "Calle Ocho 123\nLa Pequeña Habana" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "address" } });

add("case-cor-79", "marker in url query",
  "Marker scan fires before URL parsing.",
  { field: "url", new_value: "https://x.com/?a=<iframe" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-80", "email field",
  "'email' is not in the allowlist.",
  { field: "email", new_value: "a@b.com" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-cor-81", "empty field",
  "Empty field names are unknown.",
  { field: "", new_value: "Shop" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unknown-field" });

add("case-cor-82", "boolean new_value",
  "Booleans are not strings.",
  { field: "name", new_value: true },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-value" });

add("case-cor-83", "numeric input",
  "Numbers are not corrections.",
  42,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-cor-84", "null submitter",
  "Null submitted_by fails the string rule.",
  { field: "name", new_value: "Shop", submitted_by: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-submitter" });

add("case-cor-85", "url with port",
  "Ports are fine.",
  { field: "url", new_value: "https://example.com:443/menu" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-86", "percent-encoded marker",
  "Matching is literal: percent-encoding is not decoded by the gate.",
  { field: "url", new_value: "http://example.com/%3Cscript%3E" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-87", "24-7 hours",
  "Free-form hours text is accepted.",
  { field: "hours", new_value: "Open 24/7" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "hours" } });

add("case-cor-88", "short phone",
  "No phone format guessing: '911' is accepted.",
  { field: "phone", new_value: "911" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone" } });

add("case-cor-89", "apostrophe name",
  "Punctuation in names is accepted.",
  { field: "name", new_value: "O'Brien's" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-90", "address punctuation",
  "Address punctuation is accepted.",
  { field: "address", new_value: "123 Main St, Apt #4" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "address" } });

add("case-cor-91", "huge old_value",
  "old_value is never capped or scanned.",
  { field: "name", old_value: "o".repeat(5000) + "<script>", new_value: "Shop" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-92", "benign bold tag",
  "Benign HTML is not on the marker list: accepted.",
  { field: "description", new_value: "We are <b>bold</b>." },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-93", "bare bold tag in name",
  "The marker list is literal, not a tag blacklist.",
  { field: "name", new_value: "<b>" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "name" } });

add("case-cor-94", "trailing-dot host",
  "Trailing-dot hosts are valid hosts.",
  { field: "url", new_value: "http://example.com./" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-95", "unicode at cap",
  "Boundary: exactly 5000 chars is accepted, unicode or not.",
  { field: "description", new_value: "ü".repeat(5000) },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-96", "kitchen sink quarantine",
  "Markers fire in every field.",
  { field: "name", new_value: "Shop <script>", submitted_by: "owner" },
  { outcome: "bounded_success", claims: { cor_verdict: "quarantine", cor_field: "name" },
    required_quarantined: [{ property: "correction-new-value", reason: "active-content" }] });

add("case-cor-97", "kitchen sink accept",
  "Submitter plus clean value: all agree.",
  { field: "url", new_value: "https://example.com", submitted_by: "the owner" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "url" } });

add("case-cor-98", "marker only in old",
  "A marker that is being REMOVED does not hold the correction.",
  { field: "description", old_value: "<script>old</script>", new_value: "clean now" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "description" } });

add("case-cor-99", "final phone accept",
  "Formatted phone with a valid submitter.",
  { field: "phone", new_value: "+1 (555) 123-4567", submitted_by: "N. Owner" },
  { outcome: "bounded_success", claims: { cor_verdict: "accept", cor_field: "phone", cor_chars: 17 } });

// ---- manifest: missions ACQ-1601..ACQ-1650 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify(c.input)).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1601 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest, expect: c.expect };
});
const manifestCorr2 = manifest;

export { C, manifest, manifestCorr2 };
export function getCase(id) { return C.find((c) => c.id === id); }
