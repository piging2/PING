#!/usr/bin/env node
// public-apis fixture lab, batch 3: adversarial cases 700-749 (missions ACQ-0851..ACQ-0900).
// Doctrine unchanged: no coercion, no flattening, no last-wins, no guessing.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, json, expect) => C.push({ id, title, threat, json, expect });

const rec = (o) => JSON.stringify(o);
const arr = (...rs) => `[${rs.join(",")}]`;
const R = (over = {}) => rec({ id: "p1", name: "Acme Plumbing", phone: "+1 (555) 123-4567", address: "12 Main St", website: "https://acme.example/", rating: 4.5, ...over });

add("case-700", "5 clean records, batch 3 baseline",
  "Every typed field claims per record.",
  arr(R(), R({ id: "p2", name: "B" }), R({ id: "p3", name: "C" }), R({ id: "p4", name: "D" }), R({ id: "p5", name: "E" })),
  { outcome: "bounded_success", exact_claims: { place_name: 5, place_website: 5 } });

add("case-701", "record containing a results key is just a record",
  "Unknown fields are ignored even when named like the envelope.",
  arr(R({ results: ["x"] })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-702", "website as array -> type-mismatch-website",
  "Arrays never become URLs.",
  arr(R({ website: ["https://acme.example/"] })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "type-mismatch-website" }] });

add("case-703", "null phone -> absent",
  "Explicit null is no value.",
  arr(R({ phone: null })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], exact_claims: { place_name: 1 } });

add("case-704", "null address -> absent",
  "Explicit null is no value.",
  arr(R({ address: null })),
  { outcome: "bounded_success", absent_claims: ["place_address"], exact_claims: { place_name: 1 } });

add("case-705", "null website -> absent",
  "Explicit null is no value.",
  arr(R({ website: null })),
  { outcome: "bounded_success", absent_claims: ["place_website"], exact_claims: { place_name: 1 } });

add("case-706", "name of only tags -> stripped-to-empty -> empty-name quarantine",
  "Stripping that erases the value is malformed, not absent.",
  arr(R({ name: "<b></b>" })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "empty-name" }] });

add("case-707", "phone with tabs trimmed and claimed",
  "Surrounding whitespace (tabs included) is normalized.",
  arr(R({ phone: "\t+1 (555) 123-4567\t" })),
  { outcome: "bounded_success", claims: { place_phone: "+1 (555) 123-4567" } });

add("case-708", "tiny rating 1e-7 claimed",
  "Small positives are valid; no epsilon guessing.",
  `[{"id":"p1","name":"Acme","rating":1e-7}]`,
  { outcome: "bounded_success", exact_claims: { place_rating: 1 } });

add("case-709", "rating as object -> type-mismatch",
  "Objects never become ratings.",
  arr(R({ rating: { v: 4 } })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-710", "rating as array -> type-mismatch",
  "Arrays never become ratings.",
  arr(R({ rating: [4] })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-711", "website as number -> type-mismatch-website",
  "Numbers never become URLs.",
  arr(R({ website: 42 })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "type-mismatch-website" }] });

add("case-712", "address as number -> type-mismatch-address",
  "Numbers never become addresses.",
  arr(R({ address: 42 })),
  { outcome: "bounded_success", absent_claims: ["place_address"], required_quarantined: [{ reason: "type-mismatch-address" }] });

add("case-713", "phone as boolean -> type-mismatch-phone",
  "Booleans never become phones.",
  arr(R({ phone: true })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "type-mismatch-phone" }] });

add("case-714", "name as array -> type-mismatch-name",
  "Arrays never become names.",
  arr(R({ name: ["Acme"] })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "type-mismatch-name" }] });

add("case-715", "id with spaces tracked literally",
  "Identity is byte-literal; spaced ids dedupe with spaced ids.",
  arr(R({ id: " p1 " }), R({ id: " p1 ", name: "Acme Plumbing" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-716", "same id, extra unknown field -> dedupe (unknowns ignored in identity)",
  "Identity covers claim fields only; unknown extras do not fork identity (documented).",
  arr(R({ id: "p1" }), R({ id: "p1", nickname: "x" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-717", "website without trailing slash claimed",
  "No path normalization is applied.",
  arr(R({ website: "http://acme.example" })),
  { outcome: "bounded_success", claims: { place_website: "http://acme.example" } });

add("case-718", "website with port, query, fragment claimed verbatim",
  "The URL claims exactly as written.",
  arr(R({ website: "https://acme.example:443/x?y=1#z" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example:443/x?y=1#z" } });

add("case-719", "phone without country code claimed",
  "Local formats match the phone shape.",
  arr(R({ phone: "(555) 123-4567" })),
  { outcome: "bounded_success", claims: { place_phone: "(555) 123-4567" } });

add("case-720", "dotted phone claimed",
  "Dotted local format matches the phone shape.",
  arr(R({ phone: "555.123.4567" })),
  { outcome: "bounded_success", claims: { place_phone: "555.123.4567" } });

add("case-721", 'rating "NaN" (string) -> type-mismatch',
  "Strings never become numbers, even when they spell one.",
  arr(R({ rating: "NaN" })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-722", "30-digit phone -> bad-phone",
  "Over the shape cap: not a phone.",
  arr(R({ phone: "1".repeat(30) })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-723", "line separators in name collapsed",
  "Unicode line separators collapse like other whitespace.",
  arr(R({ name: "Acme Plumbing" })),
  { outcome: "bounded_success", claims: { place_name: "Acme Plumbing" } });

add("case-724", "whitespace-only input -> typed INVALID_PAYLOAD",
  "Whitespace is not a document.",
  "  \n ",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-725", "results null -> UNSUPPORTED",
  "Null results is not a record array.",
  JSON.stringify({ results: null }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-726", "results as string -> UNSUPPORTED",
  "A string results value is not coerced into an array.",
  JSON.stringify({ results: "x" }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-727", "__proto__ field ignored, claims fine",
  "JSON.parse creates own properties; the harness never walks the prototype.",
  `[{"id":"p1","name":"Acme","__proto__":{"polluted":true},"rating":4}]`,
  { outcome: "bounded_success", exact_claims: { place_name: 1, place_rating: 1 } });

add("case-728", "constructor field ignored",
  "Unknown fields are ignored regardless of name.",
  arr(R({ constructor: "x" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-729", "deep nesting in unknown field under cap parses",
  "Unknown-field depth counts toward the cap but parses under it.",
  arr(R({ meta: "DEEP" }).replace(`"DEEP"`, `[`.repeat(88) + `{}` + `]`.repeat(88))),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-730", "combining-char name claimed verbatim",
  "Unicode text claims as written; no normalization is guessed.",
  arr(R({ name: "Amé" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-731", "bidi override in name claimed verbatim (documented)",
  "Bidi analysis is out of scope; the text claims as written.",
  arr(R({ name: "\u202EAcme" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-732", "address with script stripped",
  "Markup stripping applies to addresses too.",
  arr(R({ address: `12 Main St<script></script>` })),
  { outcome: "bounded_success", claims: { place_address: "12 Main St" } });

add("case-733", "fullwidth digits -> bad-phone",
  "The phone shape is ASCII digits only (documented).",
  arr(R({ phone: "１２３４５６７８９０" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-734", "internal tab in website claimed literally",
  "The lab does not repair URLs.",
  arr(R({ website: "https://acme.example/\tx" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/\tx" } });

add("case-735", "special-char id tracked",
  "Identity is byte-literal.",
  arr(R({ id: "p:1/x?q=2" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-736", "exactly 10000 records -> no truncation flag",
  "At-cap boundary: accepted without the flag.",
  `[${Array.from({ length: 10000 }, (_, k) => `{"id":"r${k}","name":"S"}`).join(",")}]`,
  { outcome: "bounded_success", exact_claims: { place_name: 10000 }, truncated_absent: ["records"] });

add("case-737", "10001 minimal records -> truncation flagged",
  "Over the record cap: truncation, not failure.",
  `[${Array.from({ length: 10001 }, (_, k) => `{"id":"s${k}","name":"S"}`).join(",")}]`,
  { outcome: "bounded_success", exact_claims: { place_name: 10000 }, required_truncated: ["records"] });

add("case-738", "rating -0 claimed (not less than zero)",
  "-0 is not below the bound.",
  `[{"id":"p1","name":"Acme","rating":-0}]`,
  { outcome: "bounded_success", exact_claims: { place_rating: 1 } });

add("case-739", "envelope: one dup-key record quarantined, others claim",
  "Record isolation holds inside the envelope.",
  `{"results":[${R()},${`{"id":"p2","name":"B","name":"C"}`},${R({ id: "p3", name: "D" })}]}`,
  { outcome: "bounded_success", exact_claims: { place_name: 2 }, required_quarantined: [{ reason: "duplicate-key" }] });

add("case-740", "5KB address -> truncation flagged",
  "Over the 4KiB text cap: truncation flagged, record still processed.",
  arr(R({ address: "a".repeat(5000) })),
  { outcome: "bounded_success", exact_claims: { place_address: 1 }, required_truncated: ["fields"] });

add("case-741", 'phone "+" only -> bad-phone',
  "A bare plus is not a phone.",
  arr(R({ phone: "+" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-742", '"https://" -> degenerate-website quarantine',
  "A scheme with no authority is not a navigation candidate.",
  arr(R({ website: "https://" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "degenerate-website" }] });

add("case-743", '"https://?x=1" -> degenerate-website quarantine',
  "A scheme with no authority is not a navigation candidate.",
  arr(R({ website: "https://?x=1" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "degenerate-website" }] });

add("case-744", "name of tags plus spaces -> empty-name quarantine",
  "Stripping that erases the value is malformed.",
  arr(R({ name: "   <i></i>   " })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "empty-name" }] });

add("case-746", "credential website in second record redacted",
  "Secret-shaped: quarantined with redaction; first record claims.",
  arr(R(), R({ id: "p2", name: "B", website: "https://u:pw@acme.example/" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2, place_website: 1 }, required_quarantined: [{ reason: "credential-website" }], forbidden_values: ["pw@acme.example"] });

add("case-747", '"+1234567" (7 digits with plus) claimed',
  "At the digit boundary with a plus: valid.",
  arr(R({ phone: "+1234567" })),
  { outcome: "bounded_success", claims: { place_phone: "+1234567" } });

add("case-748", "rating 2.5e-1 claimed as 0.25",
  "Exponent notation parses to its value.",
  `[{"id":"p1","name":"Acme","rating":2.5e-1}]`,
  { outcome: "bounded_success", claims: { place_rating: 0.25 } });

add("case-749", "single record with only unknown fields -> no claims",
  "Unknown fields never produce claims.",
  `[{"id":"p1","zzz":1,"meta":{"a":[1,2]}}]`,
  { outcome: "bounded_success", expect_no_claims: true });

add("case-745", "api kitchen sink 3 -> exact claim set",
  "Degenerate site, stripped-empty name, bad phone, numeric ids, empty record.",
  `[${R({ id: "p1" })},${R({ id: "p2", name: "B", website: "https://" })},${R({ id: "p3", name: "<b></b>" })},${R({ id: 9, name: "Nine", phone: "12" })},{}]`,
  { outcome: "bounded_success",
    exact_claims: { place_name: 3, place_rating: 4 },
    required_quarantined: [{ reason: "degenerate-website" }, { reason: "empty-name" }, { reason: "bad-phone" }] });

// ---- manifest: missions ACQ-0851..ACQ-0900 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.json, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(851 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.json, "utf8"), expect: c.expect };
});
const manifest3 = manifest;

export { C, manifest, manifest3 };
export function getCase(id) { return C.find((c) => c.id === id); }
