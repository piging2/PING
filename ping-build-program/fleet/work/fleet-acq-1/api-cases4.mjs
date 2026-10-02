#!/usr/bin/env node
// public-apis fixture lab, batch 4: adversarial cases 750-799 (missions ACQ-0901..ACQ-0950).
// Doctrine unchanged: no coercion, no flattening, no last-wins, no guessing.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, json, expect) => C.push({ id, title, threat, json, expect });

const rec = (o) => JSON.stringify(o);
const arr = (...rs) => `[${rs.join(",")}]`;
const R = (over = {}) => rec({ id: "p1", name: "Acme Plumbing", phone: "+1 (555) 123-4567", address: "12 Main St", website: "https://acme.example/", rating: 4.5, ...over });

add("case-750", "5 clean records, batch 4 baseline",
  "Every typed field claims per record.",
  arr(R(), R({ id: "p2", name: "B" }), R({ id: "p3", name: "C" }), R({ id: "p4", name: "D" }), R({ id: "p5", name: "E" })),
  { outcome: "bounded_success", exact_claims: { place_name: 5, place_phone: 5 } });

add("case-751", "website trailing newline trimmed",
  "Surrounding whitespace is normalized.",
  arr(R({ website: "https://acme.example/\n" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/" } });

add("case-752", "mixed-case scheme claimed verbatim",
  "Scheme match is case-insensitive; no normalization applied.",
  arr(R({ website: "HtTpS://acme.example/" })),
  { outcome: "bounded_success", claims: { place_website: "HtTpS://acme.example/" } });

add("case-753", "fullwidth plus+digits -> bad-phone",
  "The phone shape is ASCII only (documented).",
  arr(R({ phone: "＋１２３４５６７" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-754", "arabic-indic digit rating string -> type-mismatch",
  "Strings never become numbers, in any script.",
  arr(R({ rating: "٤.٥" })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-755", "BEL control char in name -> control-chars quarantine",
  "C0 controls (outside tab/LF/CR) are hostile in text claims.",
  `[{"id":"p1","name":"Acme\\u0007 Plumbing"}]`,
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "control-chars-name" }] });

add("case-756", "null char in address -> control-chars quarantine",
  "Nul bytes never enter a claim.",
  `[{"id":"p1","name":"Acme","address":"12 Main\\u0000 St"}]`,
  { outcome: "bounded_success", absent_claims: ["place_address"], required_quarantined: [{ reason: "control-chars-address" }] });

add("case-757", "tab inside name collapses",
  "Tabs are ordinary whitespace, not control-hostile.",
  arr(R({ name: "Acme\tPlumbing" })),
  { outcome: "bounded_success", claims: { place_name: "Acme Plumbing" } });

add("case-758", "spaced phone claimed",
  "Space-separated digit groups match the phone shape.",
  arr(R({ phone: "123 456 7890" })),
  { outcome: "bounded_success", claims: { place_phone: "123 456 7890" } });

add("case-759", "phone with ext text -> bad-phone",
  "Extension text is not part of the supported phone shape (documented).",
  arr(R({ phone: "(123) 456-7890 x123" })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-760", "@ in path (not authority) claimed verbatim",
  "Only authority userinfo is secret-shaped; path @ is literal.",
  arr(R({ website: "https://acme.example/@user" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/@user" } });

add("case-761", "@ in query claimed verbatim",
  "Query @ is literal, not userinfo.",
  arr(R({ website: "https://acme.example/?q=@user" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/?q=@user" } });

add("case-762", "integer rating 5 claimed",
  "Integers are numbers.",
  arr(R({ rating: 5 })),
  { outcome: "bounded_success", claims: { place_rating: 5 } });

add("case-763", "long-float rating claimed unrounded",
  "Precision is preserved exactly as parsed.",
  `[{"id":"p1","name":"Acme","rating":0.30000000000000004}]`,
  { outcome: "bounded_success", claims: { place_rating: 0.30000000000000004 } });

add("case-764", "rating -1e10 -> out-of-range",
  "Huge negatives are not ratings.",
  `[{"id":"p1","name":"Acme","rating":-1e10}]`,
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-765", "rating 1e10 -> out-of-range",
  "Huge positives are not ratings.",
  `[{"id":"p1","name":"Acme","rating":1e10}]`,
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-766", "cap measured after stripping, not before",
  "4096 chars under tags: stripped length rules (documented).",
  arr(R({ name: `<b>${"x".repeat(4096)}</b>` })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, truncated_absent: ["fields"] });

add("case-767", "4097 chars under tags -> truncation flagged",
  "Stripped length over the cap fires the flag.",
  arr(R({ name: `<b>${"x".repeat(4097)}</b>` })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_truncated: ["fields"] });

add("case-768", "same id, reordered keys -> dedupe",
  "Identity compares field signatures, not key order.",
  arr(R(), `{"rating":4.5,"website":"https://acme.example/","address":"12 Main St","phone":"+1 (555) 123-4567","name":"Acme Plumbing","id":"p1"}`),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-769", '"p1 " vs "p1" are distinct ids',
  "Identity is byte-literal, including spaces.",
  arr(R({ id: "p1 " }), R({ id: "p1", name: "Other" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 } });

add("case-770", "depth-2 dup keys ignored, record claims",
  "Dup-key refusal is record-level only (documented).",
  arr(R({ meta: "DUP" }).replace(`"DUP"`, `{"x":{"a":1,"a":2}}`)),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-771", "middle record dup-key quarantined, neighbors claim",
  "Record isolation: one bad record does not poison the batch.",
  `[${R({ id: "p1" })},${`{"id":"p2","name":"B","name":"C"}`},${R({ id: "p3", name: "D" })}]`,
  { outcome: "bounded_success", exact_claims: { place_name: 2 }, required_quarantined: [{ reason: "duplicate-key" }] });

add("case-772", "website with port 80 claimed",
  "Default ports are not stripped (no normalization).",
  arr(R({ website: "https://acme.example:80/" })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example:80/" } });

add("case-773", "IP-literal website claimed verbatim (documented)",
  "The lab does not make SSRF judgments; it extracts literally.",
  arr(R({ website: "http://192.168.1.1/" })),
  { outcome: "bounded_success", claims: { place_website: "http://192.168.1.1/" } });

add("case-774", "IPv6-literal website claimed verbatim",
  "Bracketed hosts claim as written.",
  arr(R({ website: "http://[::1]/" })),
  { outcome: "bounded_success", claims: { place_website: "http://[::1]/" } });

add("case-775", "envelope baseline with valid intl phone",
  "Record rules apply identically inside the envelope.",
  JSON.stringify({ results: [JSON.parse(R({ phone: "+49.171.234.5678" }))] }),
  { outcome: "bounded_success", claims: { place_phone: "+49.171.234.5678" } });

add("case-776", "rating -0.0 claimed",
  "-0.0 is not less than zero.",
  `[{"id":"p1","name":"Acme","rating":-0.0}]`,
  { outcome: "bounded_success", exact_claims: { place_rating: 1 } });

add("case-777", "surrogate-pair emoji name claimed",
  "Astral-plane text claims as written.",
  arr(R({ name: "Acme 🪠" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 } });

add("case-778", "nbsp in address collapses",
  "Non-breaking spaces collapse like other whitespace.",
  arr(R({ address: "12\u00A0Main St" })),
  { outcome: "bounded_success", claims: { place_address: "12 Main St" } });

add("case-779", 'duplicate "results" keys: first wins for scanning (documented)',
  "Envelope dup keys are out of the record-level rule; scan order decides.",
  `{"results":[${R({ id: "p1", name: "First" })}],"results":[${R({ id: "p2", name: "Second" })}]}`,
  { outcome: "bounded_success", claims: { place_name: "First" }, forbidden_values: ["Second"] });

add("case-780", "same id, null vs valued name -> unresolved",
  "Null and valued fields produce different signatures.",
  arr(R({ id: "p1" }), R({ id: "p1", name: null })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_unresolved: ["record"] });

add("case-781", "24-char phone claimed (at cap)",
  "At the shape cap: valid.",
  arr(R({ phone: "1".repeat(24) })),
  { outcome: "bounded_success", exact_claims: { place_phone: 1 } });

add("case-782", "25-char phone -> bad-phone",
  "One over the shape cap: not a phone.",
  arr(R({ phone: "1".repeat(25) })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "bad-phone" }] });

add("case-783", "ftp website -> bad-scheme",
  "ftp is outside the http(s) allowlist.",
  arr(R({ website: "ftp://acme.example/f" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "bad-scheme-website" }] });

add("case-784", "tel: website -> bad-scheme",
  "tel: URIs are not website claims.",
  arr(R({ website: "tel:+15551234567" })),
  { outcome: "bounded_success", absent_claims: ["place_website"], required_quarantined: [{ reason: "bad-scheme-website" }] });

add("case-785", "newline-only name -> empty-name",
  "Whitespace-only is empty.",
  arr(R({ name: "\n" })),
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "empty-name" }] });

add("case-786", "tab-only address -> empty-address",
  "Whitespace-only is empty.",
  arr(R({ address: "\t" })),
  { outcome: "bounded_success", absent_claims: ["place_address"], required_quarantined: [{ reason: "empty-address" }] });

add("case-787", 'rating " 4.5" (leading space) -> type-mismatch',
  "No trim-then-coerce; strings never become numbers.",
  arr(R({ rating: " 4.5" })),
  { outcome: "bounded_success", absent_claims: ["place_rating"], required_quarantined: [{ reason: "type-mismatch-rating" }] });

add("case-788", "phone as number 1234567 -> type-mismatch-phone",
  "Numbers never become phones, even with 7 digits.",
  arr(R({ phone: 1234567 })),
  { outcome: "bounded_success", absent_claims: ["place_phone"], required_quarantined: [{ reason: "type-mismatch-phone" }] });

add("case-790", "same id, trailing-slash website difference -> unresolved",
  "No URL normalization: the two websites differ, so the records differ.",
  arr(R({ id: "p1" }), R({ id: "p1", website: "https://acme.example" })),
  { outcome: "bounded_success", exact_claims: { place_website: 1 }, required_unresolved: ["record"] });

add("case-791", "CRLF in name collapses",
  "CRLF collapses to a single space.",
  arr(R({ name: "Acme\r\nPlumbing" })),
  { outcome: "bounded_success", claims: { place_name: "Acme Plumbing" } });

add("case-792", "exponent id is numeric -> no tracking",
  "Only string ids participate in identity.",
  arr(R({ id: 1e3 }), R({ id: 1e3, name: "Other" })),
  { outcome: "bounded_success", exact_claims: { place_name: 2 } });

add("case-793", "identical records with quarantined rating dedupe",
  "Dedupe happens before field extraction; one quarantine, one name claim.",
  arr(R({ rating: 6 }), R({ rating: 6 })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_quarantined: [{ reason: "out-of-range-rating" }] });

add("case-794", "website with dot-segment claimed verbatim",
  "No path normalization is applied.",
  arr(R({ website: "https://acme.example/." })),
  { outcome: "bounded_success", claims: { place_website: "https://acme.example/." } });

add("case-795", "compact phone claimed",
  "No-separator digit runs match the phone shape.",
  arr(R({ phone: "+1(555)123-4567" })),
  { outcome: "bounded_success", claims: { place_phone: "+1(555)123-4567" } });

add("case-796", "address with # claimed",
  "Fragment-like address text is literal.",
  arr(R({ address: "12 Main St, Apt #5" })),
  { outcome: "bounded_success", claims: { place_address: "12 Main St, Apt #5" } });

add("case-797", "triple same-id chain -> two unresolved",
  "Each differing sighting conflicts with the first; none is preferred.",
  arr(R({ id: "p1" }), R({ id: "p1", name: "B" }), R({ id: "p1", name: "C" })),
  { outcome: "bounded_success", exact_claims: { place_name: 1 }, required_unresolved: ["record"] });

add("case-798", "DEL char in name -> control-chars quarantine",
  "DEL is hostile in text claims.",
  `[{"id":"p1","name":"Acme\\u007F"}]`,
  { outcome: "bounded_success", absent_claims: ["place_name"], required_quarantined: [{ reason: "control-chars-name" }] });

add("case-799", "tab inside address collapses",
  "Interior tabs are ordinary whitespace.",
  arr(R({ address: "ok\ttext" })),
  { outcome: "bounded_success", claims: { place_address: "ok text" } });

add("case-789", "api kitchen sink 4 -> exact claim set",
  "Control-char name, out-of-range rating, ftp site, reordered-key dedupe, empty record.",
  `[${R({ id: "p1" })},${`{"id":"p2","name":"B\\u0007","rating":9}`},${R({ id: "p3", name: "C", website: "ftp://a.example" })},${`{"rating":4.5,"website":"https://acme.example/","address":"12 Main St","phone":"+1 (555) 123-4567","name":"Acme Plumbing","id":"p1"}`},{}]`,
  { outcome: "bounded_success",
    exact_claims: { place_name: 2, place_rating: 2 },
    required_quarantined: [{ reason: "control-chars-name" }, { reason: "out-of-range-rating" }, { reason: "bad-scheme-website" }] });

// ---- manifest: missions ACQ-0901..ACQ-0950 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.json, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(901 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.json, "utf8"), expect: c.expect };
});
const manifest4 = manifest;

export { C, manifest, manifest4 };
export function getCase(id) { return C.find((c) => c.id === id); }
