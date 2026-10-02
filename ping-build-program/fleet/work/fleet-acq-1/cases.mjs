#!/usr/bin/env node
// html-hardening fixture lab: 50 adversarial HTML cases + expectation manifest.
// Each case is synthetic, deterministic, and designed to trap exactly one
// parser-guess failure mode. The manifest declares, per case, what the harness
// MUST produce (typed failure class or bounded outcome) and what it MUST NOT
// produce (the specific guess that would be "parser guess turned into fact").
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, html, expect) => C.push({ id, title, threat, html, expect });

const doc = (body, head = "") =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acme Plumbing Co</title>${head}</head><body>${body}</body></html>`;

// ---- P-bounds stress cases (lane-d contract 3.2) ----
add("case-00", "script plants fake phone; strip must win (P7)",
  "A <script> block contains a phone number that appears nowhere else. A naive text extractor would claim it.",
  doc(`<p>Call us today!</p><script>var decoy="(970) 555-0199"; track(decoy);</script><p>Real line: <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["(970) 555-0199", "9705550199", "+19705550199"], required_notes: ["scriptStripped"] });

add("case-01", "style block plants fake business name (P7)",
  "CSS content declarations carry a fake name; style must be stripped before any claim extraction.",
  doc(`<h1>Acme Plumbing Co</h1><style>.x::after{content:"Zebra Fake Enterprises";}</style>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, forbidden_values: ["Zebra Fake Enterprises"], required_notes: ["styleStripped"] });

add("case-02", "1M nested divs: DOM node cap abort (P1)",
  "Deep nesting bomb; parser must abort with a typed record, not OOM.",
  "<html><body>" + "<div>".repeat(1000000) + "x" + "</div>".repeat(1000000) + "</body></html>",
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "dom-node-cap" });

add("case-03", "10 MiB visible text: text cap with truncation flag (P2)",
  "Oversized text must be truncated WITH the flag set, never silently cut.",
  doc(`<h1>Acme Plumbing Co</h1><p>${"lorem ipsum dolor sit amet ".repeat(380000)}</p><p>Contact <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", required_truncated: ["text"], claims: { phone: "+19705550100" } });

add("case-04", "100k link farm: link cap + truncated_links note (P3)",
  "Link farm must stop at 10k links with the truncation recorded.",
  doc(`<h1>Acme Plumbing Co</h1>` + Array.from({ length: 100000 }, (_, k) => `<a href="/p${k}">p${k}</a>`).join("")),
  { outcome: "bounded_success", required_truncated: ["links"], forbidden_values: [] });

const case05Body = `<h1>Acme Plumbing Co</h1>` + Array.from({ length: 200 }, () =>
  `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}</script>`).join("");
add("case-05", "200 JSON-LD blocks: block cap + note (P4)",
  "JSON-LD bomb must stop at 50 blocks; first-block name claim still valid.",
  doc(case05Body),
  { outcome: "bounded_success", required_truncated: ["jsonld"], claims: { business_name: "Acme Plumbing Co" } });

add("case-06", "heavy-attribute tag storm: parse wall-clock budget (P6)",
  "5000 well-formed tags each carrying a 5KB attribute (~25MB). Parsing takes ~2s; the runner TIGHTENS the budget to 40ms (contract: callers may tighten, never loosen) so the abort path is exercised deterministically: typed TIMEOUT, partial state discarded, zero claims.",
  "<html><body>" + Array.from({ length: 5000 }, (_, k) => `<div data-x${k}="${"a".repeat(5000)}">t${k}</div>`).join("") + "</body></html>",
  { outcome: "typed_failure", failure_class: "TIMEOUT", failure_signal: "parse-deadline-exceeded", tight_budget_ms: 40 });

add("case-07", "2000 meta tags: meta cap + note (P5)",
  "Meta bomb; parser caps at 500 entries and records it.",
  doc(`<h1>Acme Plumbing Co</h1>`, Array.from({ length: 2000 }, (_, k) => `<meta name="x-${k}" content="v${k}">`).join("")),
  { outcome: "bounded_success", required_truncated: ["meta"] });

add("case-08", "500k unclosed divs: node cap on malformed input (P1)",
  "Unclosed-tag bomb; cap still fires, no invented tree structure.",
  "<html><body>" + "<div><span>".repeat(250000),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "dom-node-cap" });

add("case-09", "10 MB title attribute: attribute byte cap (P-cap)",
  "Single giant attribute must be truncated with flag, not buffered whole into claims.",
  doc(`<h1 title="${"A".repeat(10 * 1024 * 1024)}">Acme Plumbing Co</h1>`),
  { outcome: "bounded_success", required_truncated: ["attr"], claims: { business_name: "Acme Plumbing Co" } });

// ---- hidden / inert / non-visible content: never claimed ----
add("case-10", "display:none span holds the only phone -> no phone claim",
  "Hidden-by-inline-style content is quarantined to hiddenText; claims see visible text only.",
  doc(`<h1>Acme Plumbing Co</h1><span style="display:none">(970) 555-0777</span><p>No public number listed.</p>`),
  { outcome: "bounded_success", absent_claims: ["phone"], forbidden_values: ["9705550777", "+19705550777"] });

add("case-11", "HTML comment hides a phone -> comments never extracted",
  "Comments are inert; a phone inside a comment must not become a claim.",
  doc(`<h1>Acme Plumbing Co</h1><!-- internal: (970) 555-0666 --><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550666", "+19705550666"] });

add("case-12", "template tag content is inert",
  "<template> content is never rendered; its phone must not be claimed.",
  doc(`<h1>Acme Plumbing Co</h1><template><p>(970) 555-0555</p></template><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550555", "+19705550555"], required_notes: ["inertRegions"] });

add("case-13", "noscript fallback labeled, not claimed",
  "noscript text is evidence (labeled noscript-only), excluded from claim extraction.",
  doc(`<h1>Acme Plumbing Co</h1><noscript><p>JS-disabled line: (970) 555-0444</p></noscript><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550444", "+19705550444"] });

add("case-14", "iframe srcdoc is inert",
  "srcdoc content is a separate document; never parsed for claims.",
  doc(`<h1>Acme Plumbing Co</h1><iframe srcdoc="<p>(970) 555-0333</p>"></iframe><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550333", "+19705550333"], required_notes: ["inertRegions"] });

add("case-15", "SVG <text> is evidence, not a claim source",
  "SVG text nodes go to evidence strings; the SVG phone must not be claimed.",
  doc(`<h1>Acme Plumbing Co</h1><svg><text>(970) 555-0222</text></svg><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550222", "+19705550222"] });

add("case-16", "form input values never extracted",
  "Input values are not user-visible content; the prefilled phone must not be claimed.",
  doc(`<h1>Acme Plumbing Co</h1><form><input name="phone" value="(970) 555-0111"></form><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550111", "+19705550111"] });

add("case-17", "img alt text is evidence, not a claim",
  "Alt text is recorded as an evidence string; the alt phone must not be claimed.",
  doc(`<h1>Acme Plumbing Co</h1><img alt="storefront, call (970) 555-0888" src="x.jpg"><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550888", "+19705550888"] });

add("case-18", "data-* attribute JSON never scanned for claims",
  "Structured data smuggled in data-* attributes is quarantined, never parsed into claims.",
  doc(`<h1>Acme Plumbing Co</h1><div data-biz='{"phone":"(970) 555-0999"}'>x</div><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550999", "+19705550999"] });

add("case-19", "CDATA section is evidence, not markup",
  "CDATA content is recorded as evidence; the CDATA phone must not be claimed.",
  doc(`<h1>Acme Plumbing Co</h1><![CDATA[(970) 555-0123]]><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550123", "+19705550123"] });

// ---- conflicts: never pick a winner ----
add("case-20", "title vs og:title vs h1 disagree -> no name claim",
  "Three distinct business names; the parser must not crown one. Conflict recorded, zero claims for the field.",
  `<!DOCTYPE html><html><head><title>Acme Plumbing Co</title><meta property="og:title" content="Acme Plumbing LLC"></head><body><h1>ACME PLUMBING SERVICES</h1></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"], forbidden_values: [] });

add("case-21", "two tel: links disagree -> no phone claim",
  "Two different tel: numbers; no single phone claim; both kept as unresolved candidates.",
  doc(`<h1>Acme Plumbing Co</h1><a href="tel:+19705550100">Sales</a><a href="tel:+19705550200">Support</a>`),
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"] });

add("case-22", "link text vs tel: href mismatch -> no phone claim",
  "Anchor text says one number, href dials another; conflict, no claim.",
  doc(`<h1>Acme Plumbing Co</h1><a href="tel:+19705550999">(970) 555-0100</a>`),
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"], forbidden_values: ["+19705550100", "+19705550999"] });

add("case-23", "JSON-LD type vs HTML signal conflict on business kind",
  "JSON-LD says Organization, og:type says website; type is not a claimed field — assert no invented type claim and names agree.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<meta property="og:type" content="website"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme Plumbing Co"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, forbidden_values: [] });

add("case-24", "base href vs canonical vs og:url disagree -> no page_url claim",
  "Three distinct URL signals; the parser must not guess the canonical URL.",
  `<!DOCTYPE html><html><head><base href="https://a.example/"><link rel="canonical" href="https://b.example/page"><meta property="og:url" content="https://c.example/other"></head><body><h1>Acme Plumbing Co</h1></body></html>`,
  { outcome: "bounded_success", absent_claims: ["page_url"], required_unresolved: ["page_url"] });

add("case-25", "two titles -> no name claim from title alone",
  "Duplicate <title> tags; ambiguous; no business_name claim may rest on title.",
  `<!DOCTYPE html><html><head><title>Acme Plumbing Co</title><title>Best Plumbers GJ</title></head><body><p>hi</p></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-26", "address fragments in inconsistent order -> no address claim",
  "Address text appears in two orders; parser does not assemble a canonical address (address is not a claimed field at all).",
  doc(`<h1>Acme Plumbing Co</h1><p>Visit us: Grand Junction CO 81501, 123 Main St</p><p>Or: 123 Main St, Grand Junction, CO 81501</p>`),
  { outcome: "bounded_success", absent_claims: ["address"], forbidden_values: [] });

add("case-27", "hours stated two ways -> no hours claim",
  "Conflicting hours; hours are not a claimed field; nothing invented.",
  doc(`<h1>Acme Plumbing Co</h1><p>Open 24 hours</p><p>Hours: Mon-Fri 9am-5pm</p>`),
  { outcome: "bounded_success", absent_claims: ["hours"], forbidden_values: [] });

add("case-28", "og:description vs body conflict on hours -> still no hours claim",
  "Meta/body disagreement changes nothing: no claim without a single verified source shape.",
  doc(`<h1>Acme Plumbing Co</h1><p>Hours: Mon-Fri 9am-5pm</p>`, `<meta property="og:description" content="Open 24 hours, 7 days">`),
  { outcome: "bounded_success", absent_claims: ["hours"], forbidden_values: [] });

add("case-29", "identical JSON-LD blocks dedupe to one claim, two provenances",
  "Duplicate identical blocks are one claim with multi-source provenance, not two claims.",
  doc(`<h1>Acme Plumbing Co</h1>` + `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}</script>`.repeat(2)),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, min_provenance: { business_name: 2 } });

// ---- malformed / adversarial encodings ----
add("case-30", "invalid JSON-LD block quarantined, valid blocks still parsed",
  "One of three JSON-LD blocks is broken JSON; it is quarantined with its index, the rest parse.",
  doc(`<h1>Acme Plumbing Co</h1>` +
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}</script>` +
    `<script type="application/ld+json">{broken json,,,</script>` +
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","telephone":"+1-970-555-0100"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co", phone: "+19705550100" }, required_notes: ["malformedJsonLd"] });

add("case-31", "unclosed and overlapping tags do not crash or invent structure",
  "Malformed nesting is parsed defensively; visible phone still extracted once, no duplicates invented.",
  `<html><body><h1>Acme Plumbing Co<b><i></b></i><p>Call <a href="tel:+19705550100">(970) 555-0100</a><p>unclosed`,
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: [] });

add("case-32", "entity-encoded phone decodes deterministically",
  "Numeric entities are a deterministic decode, not a guess; the decoded phone is claimable with visible-text provenance.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call &#40;970&#41; &#x35;&#x35;&#x35;-&#x30;&#x31;&#x30;&#x30; today</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: [] });

add("case-33", "fullwidth digit phone is NOT pattern-matched",
  "Homoglyph digits are not in the pinned ASCII pattern set; no claim is emitted rather than a normalized guess.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call \uff19\uff17\uff10 555 0100 today</p>`),
  { outcome: "bounded_success", absent_claims: ["phone"], forbidden_values: ["9705550100", "+19705550100"] });

add("case-34", "obfuscated email 'name [at] domain' is NOT deobfuscated",
  "Deobfuscation would be a guess; the verbatim string stays evidence, no email claim.",
  doc(`<h1>Acme Plumbing Co</h1><p>Email info [at] acmeplumbing [dot] com</p>`),
  { outcome: "bounded_success", absent_claims: ["email"], forbidden_values: ["info@acmeplumbing.com"] });

add("case-35", "meta refresh recorded, never followed",
  "A refresh redirect is an observation note for the fetch layer, not a fact about this page.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<meta http-equiv="refresh" content="0;url=https://other.example/">`),
  { outcome: "bounded_success", required_notes: ["metaRefresh"], absent_claims: ["page_url"] });

add("case-36", "invalid <time datetime> is not parsed into a claim",
  "Impossible date stays raw with a flag; no date claim invented.",
  doc(`<h1>Acme Plumbing Co</h1><p>Founded <time datetime="2026-13-45">a while ago</time></p>`),
  { outcome: "bounded_success", absent_claims: ["founding_date"], forbidden_values: [] });

add("case-37", "charset conflict flagged, text still bounded",
  "Two conflicting charset declarations; decode proceeds with an explicit ambiguity flag in provenance, no silent choice.",
  `<html><head><meta charset="utf-8"><meta charset="windows-1252"><title>Acme Plumbing Co</title></head><body><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p></body></html>`,
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, required_notes: ["charsetConflict"], forbidden_values: [] });

add("case-38", "empty body after script strip is legitimate empty, not failure",
  "A page whose only content was script yields empty text: an observation with absent fields, never a failure record.",
  `<html><head><title>x</title></head><body><script>var a=1;</script></body></html>`,
  { outcome: "bounded_success", absent_claims: ["phone", "email"], forbidden_values: [] });

add("case-39", "fragment without <html> wrapper parses fine",
  "Tag-soup fragments are handled; no structure invented. The lone <h1> is uncorroborated so no name claim is emitted (corroboration rule); the distinctive phone pattern still claims.",
  `<h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`,
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, absent_claims: ["business_name"], forbidden_values: [] });

// ---- positive controls: unambiguous pages DO yield claims ----
add("case-40", "clean page: single tel: + matching text -> one phone claim, two provenances",
  "Positive control: agreement across sources yields a claim with multi-source provenance.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a> or (970) 555-0100 anytime.</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, min_provenance: { phone: 2 } });

add("case-41", "clean page: mailto: link -> email claim",
  "Positive control: unambiguous mailto yields an email claim.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="mailto:info@acmeplumbing.example">Email us</a></p>`),
  { outcome: "bounded_success", claims: { email: "info@acmeplumbing.example" } });

add("case-42", "clean page: title + og:title + h1 agree -> name claim, three provenances",
  "Positive control: unanimous name signals yield one claim with three provenances.",
  `<!DOCTYPE html><html><head><title>Acme Plumbing Co</title><meta property="og:title" content="Acme Plumbing Co"></head><body><h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p></body></html>`,
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co", phone: "+19705550100" }, min_provenance: { business_name: 3 } });

add("case-43", "clean page: canonical + og:url agree -> page_url claim",
  "Positive control: agreeing URL signals yield one page_url claim.",
  `<!DOCTYPE html><html><head><link rel="canonical" href="https://acme.example/"><meta property="og:url" content="https://acme.example/"></head><body><h1>Acme Plumbing Co</h1></body></html>`,
  { outcome: "bounded_success", claims: { page_url: "https://acme.example/" } });

add("case-44", "clean page: JSON-LD name + telephone agree with HTML -> full claim set",
  "Positive control: JSON-LD and visible HTML in agreement produce the full bounded claim set with provenance.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`,
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co","telephone":"+1-970-555-0100"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co", phone: "+19705550100" } });

// ---- cross-cutting adversarial extras ----
add("case-45", "keyword-stuffed footer: no location inference from keyword soup",
  "500 city names in a footer must not produce any location claim; location inference from text is not a claimed field.",
  doc(`<h1>Acme Plumbing Co</h1><footer>${Array.from({ length: 500 }, (_, k) => `City${k}`).join(" ")}</footer><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, absent_claims: ["location", "city", "address"] });

add("case-46", "challenge-page title never becomes the business name",
  "Layering case: block-page detection is the FETCH layer's typed PERMISSION_DENIED (contract section 5), not the parser's job. The parser reports bytes honestly: the challenge <title> is uncorroborated so no business_name claim is emitted (corroboration rule kills the classic 'title-as-name' guess). The visible phone-shaped string is still extracted with visible-text provenance — a deterministic observation, not a guess.",
  `<html><head><title>Attention Required</title></head><body><h1>Please verify you are human</h1><p>Ray ID: abc123 (970) 555-0100 is not ours</p></body></html>`,
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, absent_claims: ["business_name"], forbidden_values: ["Attention Required"] });

add("case-47", "duplicate identical phone in text twice -> one claim",
  "Repeated identical evidence dedupes to a single claim; repetition is not corroboration.",
  doc(`<h1>Acme Plumbing Co</h1><p>(970) 555-0100</p><p>Again: (970) 555-0100</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, min_provenance: { phone: 1 } });

add("case-48", "lang mismatch: declared lang kept as declared, not verified",
  "lang='es' on English text: the parser records nothing about language (not a claimed field); no verification claim invented.",
  `<html lang="es"><head><title>Acme Plumbing Co</title></head><body><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p></body></html>`,
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, absent_claims: ["language"] });

add("case-49", "nested hidden ancestor quarantines descendants",
  "display:none on an ancestor hides the whole subtree from claim extraction.",
  doc(`<h1>Acme Plumbing Co</h1><div style="display:none"><p>Secret <span>(970) 555-0777</span></p></div><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550777", "+19705550777"] });

// ---- manifest ----
const manifest = C.map((c) => {
  const digest = createHash("sha256").update(c.html, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(C.indexOf(c) + 1).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.html, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
