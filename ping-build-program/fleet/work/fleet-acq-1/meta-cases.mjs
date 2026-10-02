#!/usr/bin/env node
// structured-metadata fixture lab: adversarial cases 300-349
// (missions ACQ-0401..ACQ-0450). Doctrine: classify, bound, or quarantine;
// never convert a parser guess into a canonical fact. Vocabularies under
// test: JSON-LD, microdata (itemscope/itemprop), OpenGraph/Twitter meta,
// plus the HTML vocabulary (title/h1/links/visible text) as corroboration.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, html, expect) => C.push({ id, title, threat, html, expect });

// Baseline doc: title and h1 agree on "Acme Plumbing Co" (two corroborating
// HTML-identity signals) unless a case overrides them.
const mdoc = (body, head = "") =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acme Plumbing Co</title>${head}</head><body><h1>Acme Plumbing Co</h1>${body}</body></html>`;

const JL = (obj) => `<script type="application/ld+json">${obj}</script>`;

// ---- cross-vocabulary agreement / conflict ----
add("case-300", "JSON-LD + microdata + title + h1 agree -> name claim, 4 provenances",
  "Four vocabularies, one normalized value: the claim is corroborated, not guessed.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Acme Plumbing Co</span></div>`,
    JL(`{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 4 } });

add("case-301", "JSON-LD name vs og:title conflict -> no name claim",
  "Ghost Corp (json-ld) against Acme (og/title/h1): the parser crowns none.",
  mdoc(`<p>x</p>`, `<meta property="og:title" content="Acme Plumbing Co">` + JL(`{"@context":"https://schema.org","@type":"LocalBusiness","name":"Ghost Corp"}`)),
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"], forbidden_values: ["Ghost Corp"] });

add("case-307", "two JSON-LD blocks, one value -> json-ld is one source type",
  "Duplicate blocks do not manufacture corroboration; title/h1 supply the second type.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`) + JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 4 } });

add("case-314", "og:title + title agree, no h1, no JSON-LD -> claim",
  "Open-graph and title are distinct source types; corroboration does not require JSON-LD.",
  `<html><head><title>Acme Plumbing Co</title><meta property="og:title" content="Acme Plumbing Co"></head><body><p>x</p></body></html>`,
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 2 } });

add("case-315", "twitter:title vs og:title conflict, nothing else -> unresolved",
  "Two meta vocabularies disagree with no arbiter: no claim.",
  `<html><head><meta property="og:title" content="Acme Plumbing Co"><meta name="twitter:title" content="Ghost Corp"></head><body><p>x</p></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-329", "differing title blocks even when json-ld and h1 agree",
  "The title is a real candidate, not a default: Welcome vs Acme/Acme is two values, so no claim. Corroboration needs unanimity, not majority.",
  `<html><head><title>Welcome</title></head><body><h1>Acme Plumbing Co</h1>` + JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`) + `</body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-335", "two microdata items, two names -> conflict, no claim",
  "Sibling items are independent witnesses; their disagreement is unresolved, not majority-ruled.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Acme Plumbing Co</span></div><div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Ghost Corp</span></div>`),
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"], forbidden_values: ["Ghost Corp"] });

add("case-345", "duplicate og:title + JSON-LD + title + h1 agree -> 5 provenances",
  "Repetition within one vocabulary stays one source type; the claim rests on four types.",
  mdoc(`<p>x</p>`, `<meta property="og:title" content="Acme Plumbing Co"><meta property="og:title" content="Acme Plumbing Co">` + JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 5 } });

add("case-348", "all four vocabularies agree -> claim with 5 provenances",
  "json-ld, microdata, open-graph, title, h1 unanimous: maximum corroboration.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Acme Plumbing Co</span></div>`,
    `<meta property="og:title" content="Acme Plumbing Co">` + JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 5 } });

// ---- wrong-type / wrong-shape quarantines (never coerced) ----
add("case-302", "JSON-LD numeric name -> wrong-type quarantine; title/h1 claim stands",
  "A number is not a name; it is quarantined, and the clean signals still claim.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":12345}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "name", reason: "wrong-type" }] });

add("case-303", "JSON-LD telephone array -> wrong-shape quarantine, no flattening",
  "Arrays are not auto-flattened to scalars; no ContactPoint-style traversal.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","telephone":["+1 (970) 555-0100"]}`)),
  { outcome: "bounded_success", absent_claims: ["phone"], required_quarantined: [{ property: "telephone", reason: "wrong-shape" }] });

add("case-320", "JSON-LD empty-string name -> empty-value quarantine",
  "Empty is not a value; quarantined, not claimed, not silently dropped.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":""}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "name", reason: "empty-value" }] });

add("case-332", "JSON-LD boolean name -> wrong-type quarantine",
  "true is not a business name under any coercion.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":true}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "name", reason: "wrong-type" }] });

add("case-333", "JSON-LD object name -> wrong-type quarantine, no @value unwrap",
  "No deep unwrap of language maps or value objects; the boundary is explicit.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":{"@value":"Acme Plumbing Co"}}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "name", reason: "wrong-type" }] });

add("case-334", "JSON-LD telephone object -> wrong-shape quarantine, no traversal",
  "A ContactPoint-shaped object is not traversed for its inner telephone.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","telephone":{"@type":"ContactPoint","telephone":"+19705550100"}}`)),
  { outcome: "bounded_success", absent_claims: ["phone"], required_quarantined: [{ property: "telephone", reason: "wrong-shape" }] });

add("case-346", "JSON-LD whitespace-only name -> empty-value quarantine",
  "Whitespace normalizes to empty, which is quarantined, never claimed.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":"   "}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "name", reason: "empty-value" }] });

add("case-312", "JSON-LD malformed email -> pattern-reject; mailto:+text still claim",
  "The bad structured value is quarantined; two clean signals corroborate the address.",
  mdoc(`<p>info@acmeplumbing.example</p><p><a href="mailto:info@acmeplumbing.example">Email</a></p>`,
    JL(`{"@context":"https://schema.org","email":"not-an-email"}`)),
  { outcome: "bounded_success", claims: { email: "info@acmeplumbing.example" }, required_quarantined: [{ property: "email", reason: "pattern-reject" }] });

add("case-347", "JSON-LD non-NANP telephone -> pattern-reject quarantine",
  "The NANP scope is explicit; a +52 number is not forced into it.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","telephone":"+52 55 1234 5678"}`)),
  { outcome: "bounded_success", absent_claims: ["phone"], required_quarantined: [{ property: "telephone", reason: "pattern-reject" }] });

// ---- phone / email across vocabularies ----
add("case-304", "microdata telephone text + visible text -> phone claim",
  "The itemprop text value is a real signal with microdata provenance.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="telephone">(970) 555-0100</span></div><p>Call (970) 555-0100</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, min_provenance: { phone: 2 } });

add("case-311", "JSON-LD email + mailto: agree -> email claim",
  "Structured and link vocabularies corroborate.",
  mdoc(`<p><a href="mailto:info@acmeplumbing.example">Email</a></p>`, JL(`{"@context":"https://schema.org","email":"info@acmeplumbing.example"}`)),
  { outcome: "bounded_success", claims: { email: "info@acmeplumbing.example" }, min_provenance: { email: 2 } });

add("case-324", "JSON-LD telephone with extension -> base extracted, still uncorroborated",
  "The pinned pattern matches the dialable base; the extension never enters the canonical form. Single-source means uncorroborated: no claim.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","telephone":"(970) 555-0100 x123"}`)),
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"] });

add("case-328", "JSON-LD telephone vs tel: link conflict -> no phone claim",
  "Structured and link signals disagree; neither is preferred.",
  mdoc(`<p><a href="tel:+19705550100">Call</a></p>`, JL(`{"@context":"https://schema.org","telephone":"+1 (970) 555-0200"}`)),
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"] });

add("case-342", "microdata meta telephone + visible text -> phone claim",
  "<meta itemprop=telephone content=...> is the canonical microdata idiom.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><meta itemprop="telephone" content="+19705550100"></div><p>(970) 555-0100</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, min_provenance: { phone: 2 } });

// ---- URL identity across vocabularies ----
add("case-308", "JSON-LD url + canonical + og:url agree -> page_url claim",
  "Three vocabularies, one URL: corroborated identity.",
  mdoc(`<p>x</p>`, `<link rel="canonical" href="https://acme.example/"><meta property="og:url" content="https://acme.example/">` + JL(`{"@context":"https://schema.org","url":"https://acme.example/"}`)),
  { outcome: "bounded_success", claims: { page_url: "https://acme.example/" }, min_provenance: { page_url: 3 } });

add("case-309", "JSON-LD url vs canonical conflict -> no page_url claim",
  "No canonical URL is guessed from disagreement; relative resolution never attempted.",
  mdoc(`<p>x</p>`, `<link rel="canonical" href="https://b.example/x">` + JL(`{"@context":"https://schema.org","url":"https://a.example/"}`)),
  { outcome: "bounded_success", absent_claims: ["page_url"], required_unresolved: ["page_url"] });

add("case-326", "@id is evidence only; url + canonical still claim",
  "@id is not an identity signal; disagreement with url does not block the corroborated claim.",
  mdoc(`<p>x</p>`, `<link rel="canonical" href="https://acme.example/">` + JL(`{"@context":"https://schema.org","@id":"https://id.example/x","url":"https://acme.example/"}`)),
  { outcome: "bounded_success", claims: { page_url: "https://acme.example/" } });

add("case-343", "microdata link url + canonical agree -> page_url claim",
  "<link itemprop=url> is a structured URL signal with microdata provenance.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><link itemprop="url" href="https://acme.example/"></div>`,
    `<link rel="canonical" href="https://acme.example/">`),
  { outcome: "bounded_success", claims: { page_url: "https://acme.example/" }, min_provenance: { page_url: 2 } });

add("case-325", "sameAs is evidence only, never identity",
  "sameAs URLs are recorded in notes; they never become page_url candidates.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","sameAs":["https://facebook.com/acme","https://x.com/acme"]}`)),
  { outcome: "bounded_success", absent_claims: ["page_url"], required_notes: ["sameAs"] });

// ---- microdata semantics ----
add("case-305", "unknown microdata itemtype -> note; name still extracted",
  "Unknown types are recorded, not fatal; property extraction does not require a known type.",
  mdoc(`<div itemscope itemtype="https://schema.org/FooBar"><span itemprop="name">Acme Plumbing Co</span></div>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["unknownTypes"] });

add("case-316", "unknown JSON-LD @type -> note; name still extracted",
  "Bare unknown types are recorded with their block locator.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","@type":"FooBar","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["unknownTypes"] });

add("case-317", "itemscope without itemtype -> untyped item; props extracted",
  "A typeless scope is still a scope; unknownTypes stays empty.",
  mdoc(`<div itemscope><span itemprop="name">Acme Plumbing Co</span></div>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, notes_equal: { microdataOrphans: 0 } });

add("case-318", "itemprop content attribute beats element text (spec pin)",
  "Per microdata, content=\"\" on a span wins over its text: Wrong Name vs Acme -> conflict, no claim.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name" content="Wrong Name">Acme Plumbing Co</span></div>`),
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-327", "nested itemscope as property -> parent gets quarantined ref, no leak",
  "The address scope's values never become the business's claims; the ref is quarantined as nested-item-not-traversed.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="address" itemscope itemtype="https://schema.org/PostalAddress"><span itemprop="streetAddress">123 Main St</span></span></div>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_quarantined: [{ property: "address", reason: "nested-item-not-traversed" }], absent_claims: ["streetAddress"] });

add("case-336", "itemref is not followed; orphan itemprop ignored",
  "The itemref'd telephone sits outside any scope: orphaned per spec, never a microdata candidate. Its visible text is still observed (visible-text only -> uncorroborated).",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness" itemref="extra"><span itemprop="name">Acme Plumbing Co</span></div><span id="extra" itemprop="telephone">(970) 555-0100</span>`),
  { outcome: "bounded_success", required_unresolved: ["phone"], required_notes: ["itemrefSeen"], notes_equal: { microdataOrphans: 1 } });

// ---- JSON-LD adversarial shapes ----
add("case-306", "remote @context -> recorded, never fetched",
  "A remote context URL is noted as not-fetched; extraction proceeds on the declared properties.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://example.com/context.jsonld","@type":"LocalBusiness","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["remoteContextNotFetched"] });

add("case-313", "duplicate JSON keys -> last wins deterministically",
  "JSON.parse keeps the last duplicate per spec; the surviving name agrees with HTML.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":"Ghost Corp","name":"Acme Plumbing Co"}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, forbidden_values: ["Ghost Corp"] });

add("case-319", "JSON-LD name with padding whitespace -> trimmed, agrees",
  "Normalization trims before comparison; the claim is on the trimmed value.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":"  Acme Plumbing Co  "}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-321", "55 JSON-LD blocks -> block cap fires, early blocks still parsed",
  "Over the 50-block cap: truncation flagged, first blocks honored.",
  mdoc(`<p>x</p>`, Array.from({ length: 55 }, () => JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co"}`)).join("")),
  { outcome: "bounded_success", required_truncated: ["jsonld"], claims: { business_name: "Acme Plumbing Co" } });

add("case-322", "JSON-LD inside HTML comment -> never parsed",
  "Comment stripping (html lab P7) applies before vocabulary extraction; the commented Ghost Corp never becomes a candidate.",
  mdoc(`<p>x</p>`, `<!--` + JL(`{"@context":"https://schema.org","name":"Ghost Corp"}`) + `-->`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, forbidden_values: ["Ghost Corp"] });

add("case-323", "HTML-escaped quotes inside JSON-LD -> malformed quarantine",
  "&quot; inside the script body is not valid JSON: quarantined with the parse error, never repaired by guessing.",
  mdoc(`<p>x</p>`, JL(`{"@context":"https://schema.org","name":&quot;Acme Plumbing Co&quot;}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["malformedJsonLd"] });

add("case-337", "in-string </script> ends the block early -> malformed quarantine",
  "HTML5 raw-text semantics pin: the block ends at the in-string close tag; the fragment is quarantined, not repaired.",
  `<html><head><title>Acme Plumbing Co</title></head><body><h1>Acme Plumbing Co</h1>` + JL(`{"@context":"https://schema.org","name":"</script><p>Ghost</p>"}`) + `</body></html>`,
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["malformedJsonLd"], forbidden_values: ["Ghost"] });

add("case-339", "empty JSON-LD array -> inert",
  "[] parses to no properties; the HTML signals claim undisturbed.",
  mdoc(`<p>x</p>`, JL(`[]`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-340", "JSON-LD null -> inert",
  "null is a valid JSON value with no properties.",
  mdoc(`<p>x</p>`, JL(`null`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-341", "10KB JSON-LD name -> property truncation splits the value -> conflict",
  "The 4KiB property cap truncates the structured value while the title stays whole: two values, no claim, truncation flagged.",
  `<html><head><title>${"A".repeat(10000)}</title></head><body><h1>${"A".repeat(10000)}</h1>` + JL(`{"@context":"https://schema.org","name":"${"A".repeat(10000)}"}`) + `</body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"], required_truncated: ["props"] });

add("case-344", "external JSON-LD via src -> never fetched; empty body quarantined",
  "No network in the lab, ever. The src is not dereferenced; the empty body hits the inherited malformed quarantine.",
  mdoc(`<p>x</p>`, `<script type="application/ld+json" src="https://cdn.example/x.json"></script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, required_notes: ["malformedJsonLd"] });

// ---- field isolation ----
add("case-310", "nested address object never becomes an address claim",
  "Address-shaped data is not a claimed field in any vocabulary; prose addresses stay unclaimed.",
  mdoc(`<p>123 Main St, Grand Junction, CO</p>`, JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co","address":{"@type":"PostalAddress","streetAddress":"123 Main St"}}`)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, absent_claims: ["address", "streetAddress", "location"] });

add("case-330", "description-only JSON-LD -> no name claim",
  "description is evidence, never identity; a lone title stays uncorroborated.",
  `<html><head><title>Welcome</title></head><body><p>x</p>` + JL(`{"@context":"https://schema.org","description":"Acme Plumbing Co"}`) + `</body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"], required_notes: ["descriptionSeen"] });

add("case-331", "meta description with business name -> not an identity signal",
  "meta name=description is evidence only, like og:description.",
  `<html><head><title>Welcome</title><meta name="description" content="Acme Plumbing Co, best plumbers"></head><body><p>x</p></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

// ---- kitchen sinks ----
add("case-338", "structured kitchen sink: name agrees, phone and URL conflict",
  "JSON-LD+microdata name agree -> claim. JSON-LD phone vs tel: conflict -> unresolved. og:url vs canonical conflict -> unresolved.",
  mdoc(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Acme Plumbing Co</span></div><p><a href="tel:+19705550100">Call</a></p>`,
    `<meta property="og:url" content="https://a.example/"><link rel="canonical" href="https://b.example/x">` +
    JL(`{"@context":"https://schema.org","name":"Acme Plumbing Co","telephone":"+1 (970) 555-0200"}`)),
  { outcome: "bounded_success",
    claims: { business_name: "Acme Plumbing Co" },
    absent_claims: ["phone", "page_url"],
    required_unresolved: ["phone", "page_url"],
    forbidden_values: ["+19705550200"] });

add("case-349", "hostile kitchen sink -> name unresolved, everything else absent",
  "Commented Ghost JSON-LD, a malformed block, a numeric name, an orphan microdata phone, a conflicting og:title: the only HTML signals (title/h1) are split by the og conflict. Zero claims; quarantines and notes recorded; no crash.",
  `<html><head><title>Acme Plumbing Co</title><meta property="og:title" content="Ghost Corp"></head><body><h1>Acme Plumbing Co</h1><!--` +
    JL(`{"@context":"https://schema.org","name":"Ghost Corp"}`) + `-->` +
    JL(`{"@context":"https://schema.org","name":`) +
    JL(`{"@context":"https://schema.org","name":42}`) +
    `<span itemprop="telephone">(970) 555-0100</span></body></html>`,
  { outcome: "bounded_success",
    absent_claims: ["business_name", "phone", "email", "page_url"],
    required_unresolved: ["business_name"],
    required_notes: ["malformedJsonLd"],
    required_quarantined: [{ property: "name", reason: "wrong-type" }],
    forbidden_values: ["Ghost Corp"] });

// ---- manifest: missions ACQ-0401..ACQ-0450 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.html, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(401 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.html, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
