#!/usr/bin/env node
// public-apis fixture lab, batch 2: adversarial cases 650-699 (missions ACQ-0801..ACQ-0850).
// Doctrine unchanged: no coercion, no flattening, no last-wins, no guessing.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, json, expect) => C.push({ id, title, threat, json, expect });

const rec = (o) => JSON.stringify(o);
const arr = (...rs) => `[${rs.join(",")}]`;
const R = (over = {}) => rec({ id: "p1", name: "Acme Plumbing", phone: "+1 (555) 123-4567", address: "12 Main St", website: "https://acme.example/", rating: 4.5, ...over });

add("case-650", "5 clean records -> full claim set",
  "Baseline batch 2: every typed field claims per record.",
  arr(R(), R({ id: "p2", name: "B" }), R({ id: "p3", name: "C" }), R({ id: "p4", name: "D" }), R({ id: "p5", name: "E" })),
  { outcome: "bounded_success", exact_claims: { place_name: 5, place_rating: 5 } });

add("case-651", "nested envelope {data:{results}} -> UNSUPPORTED",
  "Only the documented top-level results convention is honored; nesting is not probed.",
  JSON.stringify({ data: { results: [JSON.parse(R())] } }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-652", "array under unknown key -> UNSUPPORTED",
  "The lab does not hunt for arrays under arbitrary keys.",
  JSON.stringify({ items: [JSON.parse(R())] }),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "no-record-array" });

add("case-653", "Infinity literal -> INVALID_PAYLOAD",
  "Non-JSON literals are not parsed.",
  `[{"id":"p1","rating":Infinity}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-654", "-Infinity literal -> INVALID_PAYLOAD",
  "Signed non-JSON literals are not parsed.",
  `[{"id":"p1","rating":-Infinity}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-655", "hex number 0x10 -> INVALID_PAYLOAD",
  "JSON has no hex literals.",
  `[{"id":"p1","rating":0x10}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-656", "single-quoted strings -> INVALID_PAYLOAD",
  "JSON strings use double quotes only.",
  `[{'id':'p1'}]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-657", "trailing comma -> INVALID_PAYLOAD",
  "Strict JSON; trailing commas are not repaired.",
  `[{"id":"p1"},]`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "unparseable" });

add("case-658", "duplicate keys with identical values -> still quarantined",
  "Last-wins is refused unconditionally, even when harmless (documented).",
  `[{"id":"p1","name":"Same","name":"Same"}]`,
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "duplicate-key" }] });

add("case-659", "phone with exactly 7 digits -> claimed (boundary)",
  "At the minimum digit count: valid.",
  arr(R({ phone: "5551234" })),
  { outcome: "bounded_success", claims: { place_phone: "5551234" } });

add("case-660", "phone with 6 digits -> bad-phone",
  "Below the minimum digit count: not a phone.",
  arr(R({ phone: "555123" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-661", "phone 25 chars -> bad-phone",
  "Over the 24-char shape cap: not a phone.",
  arr(R({ phone: "+1 (555) 123-4567 x89012" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-662", "phone with letters -> bad-phone",
  "Letters never appear in the phone shape.",
  arr(R({ phone: "+1 (555) ABC-DEFG" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-663", "website uppercase scheme claimed verbatim",
  "Scheme match is case-insensitive; no normalization applied.",
  arr(R({ website: "HTTPS://acme.example/" })),
  { outcome: "bounded_success", claims: { place_website: "HTTPS://acme.example/" } });

add("case-664", "website with port claimed",
  "Ports are part of the URL as written.",
  arr(R({ website: "https://acme.example:8443/" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example:8443/" } });

add("case-665", "unicode domain claimed verbatim",
  "No punycode conversion is guessed.",
  arr(R({ website: "https://münchen.example/" })),
  { outcome: "bounded_success", claims: { place_website: "https://münchen.example/" } });

add("case-666", "website with surrounding spaces -> trimmed, claimed",
  "Surrounding whitespace is normalized, never part of the URL.",
  arr(R({ website: "  https://acme.example/  " })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/" } });

add("case-667", "website with internal space claimed literally",
  "The lab does not repair URLs; it claims them as written.",
  arr(R({ website: "https://acme.example/a b" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/a b" } });

add("case-668", "data: URL -> bad-scheme quarantine",
  "Non-http(s) schemes never become website claims.",
  arr(R({ website: "data:text/plain,hi" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "bad-scheme-website" }] });

add("case-669", "mailto: -> bad-scheme quarantine",
  "A website field holding a mailto is a scheme violation.",
  arr(R({ website: "mailto:ed@acme.example" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "bad-scheme-website" }] });

add("case-670", "protocol-relative URL -> relative-website quarantine",
  "No scheme means no navigation candidate.",
  arr(R({ website: "//acme.example/" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "relative-website" }] });

add("case-671", "userinfo without password -> credential-website",
  "Any userinfo in the authority is secret-shaped.",
  arr(R({ website: "https://user@acme.example/" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "credential-website" }] });

add("case-672", 'rating as string "5" -> type-mismatch',
  "Even a clean numeric string is never coerced.",
  arr(R({ rating: "5" })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-673", "null rating -> absent, no quarantine",
  "Explicit null is no value.",
  arr(R({ rating: null })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], exact_claims: { place_name: 1 } });

add("case-674", "rating 5.0000001 -> out-of-range",
  "Just over the top bound quarantines.",
  arr(R({ rating: 5.0000001 })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-675", "rating 4e0 -> claimed as 4",
  "Exponent notation is valid JSON; the value claims as parsed.",
  `[{"id":"p1","name":"Acme","rating":4e0}]`,
  { outcome: "bounded_success", claims: { place_rating: 4 } });

add("case-676", "emoji-only name claimed",
  "Non-empty is non-empty; the lab does not judge content.",
  arr(R({ name: "🔧🔥" })),
  { outcome: "bounded_success", claims: { place_name: "🔧🔥" } });

add("case-677", "name exactly 4KiB -> no truncation flag",
  "At-cap is accepted.",
  arr(R({ name: "n".repeat(4096) })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, truncated_absent: ["fields"] });

add("case-678", "name 4KiB+1 -> truncation flagged",
  "One char over the cap fires the flag.",
  arr(R({ name: "n".repeat(4097) })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_truncated: ["fields"] });

add("case-679", "address newlines collapsed",
  "Multiline addresses flatten to single spaces.",
  arr(R({ address: "12 Main St\nSuite 4\nGJ" })),
  { outcome: "bounded_success", claims: { place_address: "12 Main St Suite 4 GJ" } });

add("case-680", "empty address -> empty-address quarantine",
  "Present-but-empty is malformed.",
  arr(R({ address: "" })),
  { outcome: "bounded_success", absent_claims: ["place_address"], required_quarantined: [{ reason: "empty-address" }] });

add("case-681", "empty object record -> no claims, no quarantine",
  "All fields absent is a valid empty observation.",
  `[{}]`,
  { outcome: "bounded_success", expect_no_claims: true });

add("case-682", "numeric id -> no identity tracking, claims fine",
  "Only string ids participate in dedupe.",
  arr(R({ id: 7 }), R({ id: 7, name: "Other" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 } });

add("case-683", "empty-string id -> no identity tracking",
  "Falsy ids are not identities.",
  arr(R({ id: "" }), R({ id: "", name: "Other" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 } });

add("case-684", "three same-id records: dedupe then conflict",
  "Identical twin dedupes; the differing third goes unresolved.",
  arr(R({ id: "p1" }), R({ id: "p1" }), R({ id: "p1", name: "Changed" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_unresolved: ["record"] });

add("case-685", 'ids "P1" vs "p1" are distinct',
  "Identity comparison is case-sensitive.",
  arr(R({ id: "P1" }), R({ id: "p1", name: "Lower" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 } });

add("case-686", "duplicate keys nested in unknown field ignored",
  "Dup-key refusal applies to the record level only (documented).",
  arr(R({ meta: "DUP" }).replace(`"DUP"`, `{"a":1,"a":2}`)),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-687", "array element -> non-record quarantine",
  "Nested arrays are not records.",
  arr(R(), `[1,2]`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

add("case-688", "number element -> non-record quarantine",
  "Numbers are not records.",
  arr(R(), `42`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

add("case-689", "boolean element -> non-record quarantine",
  "Booleans are not records.",
  arr(R(), `true`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

add("case-690", "depth 100 nesting parses (at cap)",
  "Just under the cap: accepted.",
  arr(R({ meta: "DEEP" }).replace(`"DEEP"`, `[`.repeat(97) + `{}` + `]`.repeat(97))),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-691", "depth 101 nesting -> INVALID_PAYLOAD",
  "Just over the cap: typed failure.",
  arr(R({ meta: "DEEP" }).replace(`"DEEP"`, `[`.repeat(99) + `{}` + `]`.repeat(99))),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "depth-over-cap" });

add("case-692", "envelope results with non-record -> quarantine",
  "Record rules apply inside the envelope too.",
  JSON.stringify({ results: [JSON.parse(R()), "oops"] }),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "non-record" }] });

add("case-693", "website query+fragment claimed verbatim",
  "The URL claims exactly as written.",
  arr(R({ website: "https://acme.example/s?b=2&a=1#top" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/s?b=2&a=1#top" } });

add("case-694", "phone with extension text -> bad-phone",
  "Extensions are not part of the supported phone shape (documented).",
  arr(R({ phone: "+1 (555) 123-4567 ext. 89" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-695", 'name "null" (the string) claimed',
  "A string that spells null is still a string.",
  arr(R({ name: "null" })),
  { outcome: "bounded_success", claims: { place_name: "null" } });

add("case-696", 'rating "4.5 " (string with space) -> type-mismatch',
  "No trim-then-coerce; strings never become numbers.",
  arr(R({ rating: "4.5 " })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-698", "empty results envelope -> legitimate empty",
  "Zero records in the envelope is an observation.",
  JSON.stringify({ results: [] }),
  { outcome: "bounded_success", expect_no_claims: true });

add("case-699", "leading whitespace before array accepted",
  "Surrounding whitespace is legal JSON.",
  "  \n\t" + arr(R()),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-697", "api kitchen sink 2 -> exact claim set",
  "Hex literal aside: bad phone, mailto site, dup id, nested-dup ignored, empty record.",
  `[${R({ id: "p1" })},${R({ id: "p2", name: "B", phone: "12" })},${R({ id: "p3", name: "C", website: "mailto:x@y.z" })},${R({ id: "p2", name: "B2" })},${R({ id: "p4", name: "D", meta: "DUP" }).replace(`"DUP"`, `{"a":1,"a":2}`)},{}]`,
  { outcome: "bounded_success",
    exact_claims: { place_name: 4, place_rating: 4 },
    required_quarantined: [{ reason: "bad-phone" }, { reason: "bad-scheme-website" }],
    required_unresolved: ["record"] });

// ---- manifest: missions ACQ-0801..ACQ-0850 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.json, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(801 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.json, "utf8"), expect: c.expect };
});
const manifest2 = manifest;

export { C, manifest, manifest2 };
export function getCase(id) { return C.find((c) => c.id === id); }
