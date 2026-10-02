#!/usr/bin/env node
// public-apis fixture lab: adversarial cases 600-649 (missions ACQ-0751..ACQ-0800).
// Doctrine: classify, bound, or quarantine; no type coercion, no structure
// flattening, no last-wins on duplicate keys — never a guess as fact.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, json, expect) => C.push({ id, title, threat, json, expect });

const rec = (o) => JSON.stringify(o);
const arr = (...rs) => `[${rs.join(",")}]`;
const env = (...rs) => JSON.stringify({ results: rs.map((r) => JSON.parse(r)), page: 1 });
const R = (over = {}) => rec({ id: "p1", name: "Acme Plumbing", phone: "+1 (555) 123-4567", address: "12 Main St", website: "https://acme.example/", rating: 4.5, ...over });

// ---- happy paths ----
add("case-600", "clean array, 3 records -> field claims",
  "Baseline: typed fields claim with per-record provenance.",
  arr(R(), R({ id: "p2", name: "Beta HVAC" }), R({ id: "p3", name: "Gamma Electric" })),
  { outcome: "bounded_success", exact_claims: { place_name: 3, place_phone: 3, place_rating: 3 } });

add("case-601", "results envelope parsed",
  "The documented envelope convention is honored.",
  env(R(), R({ id: "p2", name: "Beta HVAC" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 }, notes_equal: { container: "results" } });

add("case-627", "empty array -> legitimate empty",
  "Zero records is an observation, not a failure.",
  `[]`,
  { outcome: "bounded_success", expect_no_claims: true });

add("case-649", "BOM -> stripped, parsed",
  "\uFEFF" + arr(R()),
  "﻿" + arr(R()),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

// ---- typed failures ----
add("case-602", "not JSON -> typed INVALID_PAYLOAD",
  "Unparseable input is classified, never partially read.",
  `<html>nope</html>`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-603", "empty input -> typed INVALID_PAYLOAD",
  "Empty is not a document.",
  ``,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-604", "6MB payload -> typed PERMANENT",
  "Bound violation is a typed terminal failure.",
  `[${R({ name: "x".repeat(1024) })},`.repeat(5000).slice(0, -1) + `]`.padEnd(6 * 1024 * 1024, " "),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "doc-bytes-over-cap" });

add("case-605", "200-deep nesting -> typed INVALID_PAYLOAD",
  "Depth bombs die before JSON.parse recurses.",
  `[${"[".repeat(200)}${"]".repeat(200)}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "depth-over-cap" });

add("case-606", "NaN literal -> typed INVALID_PAYLOAD",
  "Non-JSON literals are not parsed.",
  `[{"id":"p1","rating":NaN}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-607", "trailing garbage -> typed INVALID_PAYLOAD",
  "The whole document must parse; trailing bytes are not ignored silently.",
  arr(R()) + ` trailing`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-608", "top-level string -> typed UNSUPPORTED",
  "A string is not a record container; the path is not guessed.",
  `"just a string"`,
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-609", "object without results -> typed UNSUPPORTED",
  "Unknown envelope shapes are classified, not probed.",
  JSON.stringify({ data: [JSON.parse(R())] }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-632", "results not an array -> typed UNSUPPORTED",
  "A non-array results value is not coerced into one.",
  JSON.stringify({ results: { id: "p1" } }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

// ---- no-coercion quarantines ----
add("case-610", 'rating as string "4.5" -> quarantined, not coerced',
  "The canonical no-guess rule for APIs: strings never become numbers.",
  arr(R({ rating: "4.5" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-611", "rating 7 -> out-of-range quarantine",
  "Range violations quarantine the field, not the record.",
  arr(R({ rating: 7 })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-612", "phone as number -> quarantined, not stringified",
  "Numbers never become phone strings.",
  arr(R({ phone: 15551234567 })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, absent_claims: ["place_phone"], required_quarantined: [{ reason: "type-mismatch-phone" }] });

add("case-613", 'phone "not a phone" -> bad-phone quarantine',
  "Phone shape is validated; free text is not a phone.",
  arr(R({ phone: "not a phone" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "bad-phone" }] });

add("case-614", "relative website -> quarantine",
  "Relative URLs are never navigation candidates.",
  arr(R({ website: "/about" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, absent_claims: ["place_website"], required_quarantined: [{ reason: "relative-website" }] });

add("case-615", "javascript: website -> bad-scheme quarantine",
  "Non-http(s) schemes never become website claims.",
  arr(R({ website: "javascript:alert(1)" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "bad-scheme-website" }], forbidden_values: ["javascript:alert(1)"] });

add("case-616", "name as number -> quarantined, not stringified",
  "Names are strings or they are not names.",
  arr(R({ name: 42 })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "type-mismatch-name" }] });

add("case-617", "address as object -> quarantined, not flattened",
  "The lab does not guess which subfield is the address.",
  arr(R({ address: { street: "12 Main St", city: "GJ" } })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, absent_claims: ["place_address"], required_quarantined: [{ reason: "type-mismatch-address" }] });

add("case-634", "rating as boolean -> quarantined",
  "Booleans never become ratings.",
  arr(R({ rating: true })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-639", "empty-string name -> empty-name quarantine",
  "Present-but-empty is malformed, not absent.",
  arr(R({ name: "   " })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "empty-name" }] });

// ---- absent vs null ----
add("case-618", "missing name -> no name claim, others fine",
  "Missing fields are absent, not null-filled.",
  arr(rec({ id: "p1", phone: "+1 (555) 123-4567", rating: 4 })),
  { outcome: "bounded_success", absent_claims: ["place_name"], exact_claims: { place_phone: 1, place_rating: 1 } });

add("case-619", "null name -> treated as absent",
  "Explicit null is no value, not a malformed value.",
  arr(R({ name: null })),
  { outcome: "bounded_success", absent_claims: ["place_name"], exact_claims: { place_phone: 1 } });

add("case-631", "missing id -> records still claim",
  "Identity is optional; discovery does not require it.",
  arr(rec({ name: "No ID Shop", rating: 3 })),
  { outcome: "bounded_success", exact_claims: { place_name: 1, place_rating: 1 } });

// ---- identity: dedupe and conflict ----
add("case-620", "duplicate ids, identical -> dedupe",
  "The same record observed twice is one observation.",
  arr(R(), R()),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-621", "duplicate ids, different phone -> unresolved",
  "Same identity, different content: no canonical version is picked.",
  arr(R(), R({ phone: "+1 (555) 999-0000" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_unresolved: ["record"] });

add("case-641", "duplicate keys in record -> record quarantined",
  "Last-wins is a parser guess; the lab refuses to pick.",
  `[{"id":"p1","name":"First","name":"Second","rating":4}]`,
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "duplicate-key" }], forbidden_values: ["Second"] });

// ---- non-records ----
add("case-622", "string element -> non-record quarantine",
  "Non-object elements are quarantined, not skipped silently.",
  arr(R(), `"oops"`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

add("case-633", "null element -> non-record quarantine",
  "Null elements are quarantined with a typed reason.",
  arr(R(), `null`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

// ---- markup and text ----
add("case-623", "name with script tags -> stripped",
  "Embedded scripts never survive text extraction.",
  arr(R({ name: `<b>Acme</b><script></script>` })),
  { outcome: "bounded_success", claims: { place_name: "Acme" } });

add("case-624", "unicode-escaped markup in name -> decoded then stripped",
  "JSON escapes decode before stripping, so hidden markup dies too.",
  `[{"id":"p1","name":"\\u003cb\\u003eAcme\\u003c/b\\u003e"}]`,
  { outcome: "bounded_success", claims: { place_name: "Acme" } });

add("case-644", "control chars in name collapsed",
  "Newlines and tabs collapse to single spaces.",
  arr(R({ name: "Acme\n\tPlumbing" })),
  { outcome: "bounded_success", claims: { place_name: "Acme Plumbing" } });

add("case-625", "10KB name -> truncation flagged",
  "Over the 4KiB text cap: truncation flagged, record still processed.",
  arr(R({ name: "x".repeat(10000) })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_truncated: ["fields"] });

// ---- boundaries ----
add("case-628", "ratings 0 and 5 claimed (inclusive bounds)",
  "Boundary values are valid.",
  arr(R({ id: "p1", rating: 0 }), R({ id: "p2", name: "B", rating: 5 })),
  { outcome: "bounded_success", exact_claims: { place_rating: 2 } });

add("case-629", "rating -0.5 -> out-of-range quarantine",
  "Below zero is not a rating.",
  arr(R({ rating: -0.5 })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-630", "credential website -> quarantined with redaction",
  "Secret-shaped: quarantined, detail redacted per the credentials rule.",
  arr(R({ website: "https://user:s3cret@acme.example/" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "credential-website" }], forbidden_values: ["s3cret"] });

add("case-635", "intl phone with dots claimed",
  "Dotted intl format matches the phone shape.",
  arr(R({ phone: "+49.171.234.5678" })),
  { outcome: "bounded_success", claims: { place_phone: "+49.171.234.5678" } });

add("case-636", "http website claimed",
  "The scheme allowlist is http(s), not https-only.",
  arr(R({ website: "http://acme.example/" })),
  { outcome: "bounded_success", claims: { place_website: "http://acme.example/" } });

add("case-637", "integer rating 4 claimed as-is",
  "Integers are numbers; no float coercion is needed or applied.",
  arr(R({ rating: 4 })),
  { outcome: "bounded_success", claims: { place_rating: 4 } });

add("case-642", "rating 4.999999999999999 claimed unrounded",
  "Precision is preserved; the lab never rounds a claim.",
  arr(R({ rating: 4.999999999999999 })),
  { outcome: "bounded_success", claims: { place_rating: 4.999999999999999 } });

add("case-638", "unknown extra fields ignored",
  "The schema is closed for claims, open for ignoring.",
  arr(R({ hours: "9-5", tags: ["a", "b"], meta: { x: 1 } })),
  { outcome: "bounded_success", exact_claims: { place_name: 1, place_rating: 1 } });

add("case-640", "depth 50 nesting parses (under cap)",
  "Under-cap nesting is fine; the cap is the boundary.",
  arr(R({ meta: "DEEP" }).replace(`"DEEP"`, `[`.repeat(48) + `{}` + `]`.repeat(48))),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-645", "website with fragment claimed verbatim",
  "Fragments are part of the URL as written.",
  arr(R({ website: "https://acme.example/#top" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/#top" } });

add("case-647", "envelope siblings ignored",
  "Pagination metadata is not records.",
  JSON.stringify({ results: [JSON.parse(R())], page: 2, total: 99, next: "https://api.example/?p=3" }),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, forbidden_values: ["https://api.example/?p=3"] });

// ---- caps ----
add("case-626", "10001 records -> cap fires at 10k",
  "Over the 10k cap: truncation flagged, head records honored.",
  `[${Array.from({ length: 10001 }, (_, k) => R({ id: `p${k}`, name: `Shop ${k}` })).join(",")}]`,
  { outcome: "bounded_success", required_truncated: ["records"], exact_claims: { place_name: 10000 } });

add("case-643", "60000 minimal records -> cap holds at 10k",
  "Well under the byte cap but over the record cap: truncation, not failure.",
  `[${Array.from({ length: 60000 }, (_, k) => `{"id":"q${k}","name":"S"}`).join(",")}]`,
  { outcome: "bounded_success", required_truncated: ["records"], exact_claims: { place_name: 10000 } });

add("case-646", "phone with letters -> bad-phone quarantine",
  "Vanity letters are not validated as dialable; no letter-to-digit guess.",
  arr(R({ phone: "(555) ABC-DEFG" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

// ---- kitchen sink ----
add("case-648", "api kitchen sink -> exact claim set",
  "Coerced rating, bad phone, relative site, dup id, dup keys, and non-record at once.",
  `[${R({ id: "p1" })},${R({ id: "p2", name: "B", rating: "high" })},${R({ id: "p3", name: "C", phone: "xyz" })},${R({ id: "p4", name: "D", website: "/rel" })},${R({ id: "p1", name: "Changed" })},"stray",${`{"id":"p5","name":"E","name":"F"}`}]`,
  { outcome: "bounded_success",
    exact_claims: { place_name: 4, place_rating: 3 },
    required_quarantined: [{ reason: "type-mismatch-rating" }, { reason: "bad-phone" }, { reason: "relative-website" }, { reason: "non-record" }, { reason: "duplicate-key" }],
    required_unresolved: ["record"] });

// ---- manifest: missions ACQ-0751..ACQ-0800 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.json, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(751 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.json, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
