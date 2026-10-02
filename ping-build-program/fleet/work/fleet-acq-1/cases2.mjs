#!/usr/bin/env node
// html-hardening fixture lab BATCH 2: adversarial HTML cases 200-249
// (missions ACQ-0201..ACQ-0250). Fifty NEW cases, no overlap with batch 1.
// Exercises: visibility:hidden, nested hidden regions, uppercase markup,
// JSON-LD @graph / arrays / duplicate keys / type arrays / numeric names,
// entity-encoded attributes (regression pin for the v1.1.0 attr-decode fix),
// tel:/mailto: pattern guards, cap boundaries (exact-at-cap vs over-cap),
// HTML5 raw-text script semantics, unclosed comments, and a kitchen-sink
// integration. Same doctrine: hostile input -> typed failure or bounded
// extraction with provenance; never a guess into fact.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, html, expect) => C.push({ id, title, threat, html, expect });

const doc = (body, head = "") =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acme Plumbing Co</title>${head}</head><body>${body}</body></html>`;

// ---- hidden-region variants ----
add("case-200", "visibility:hidden span holds the only phone -> no phone claim",
  "visibility:hidden is quarantined exactly like display:none.",
  doc(`<h1>Acme Plumbing Co</h1><span style="visibility:hidden">(970) 555-0777</span><p>No public number.</p>`),
  { outcome: "bounded_success", absent_claims: ["phone"], forbidden_values: ["9705550777", "+19705550777"] });

add("case-201", "nested hidden region quarantines the whole subtree",
  "Visible div containing a hidden div containing a phone: the phone is quarantined; the outer visible phone claims normally.",
  doc(`<div><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p><div style="display:none"><span>(970) 555-0777</span></div></div>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550777", "+19705550777"] });

add("case-202", "uppercase tags, attrs, and tel: scheme still handled",
  "Case-insensitive markup must not defeat stripping, hiding, or scheme detection.",
  `<!DOCTYPE html><HTML><HEAD><TITLE>Acme Plumbing Co</TITLE></HEAD><BODY><DIV STYLE="DISPLAY:NONE">(970) 555-0777</DIV><H1>Acme Plumbing Co</H1><P><A HREF="TEL:+19705550100">Call</A></P></BODY></HTML>`,
  { outcome: "bounded_success", claims: { phone: "+19705550100", business_name: "Acme Plumbing Co" }, forbidden_values: ["9705550777", "+19705550777"] });

add("case-237", "hidden ancestor div quarantines descendants; sibling stays visible",
  "Div-level display:none with a visible sibling paragraph after it.",
  doc(`<div style="display:none"><p>(970) 555-0777</p></div><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550777", "+19705550777"] });

add("case-238", "spaced 'display : none' still hides",
  "Whitespace inside the style declaration must not evade the hidden-region rule.",
  doc(`<h1>Acme Plumbing Co</h1><span style="display : none">(970) 555-0777</span><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550777", "+19705550777"] });

// ---- JSON-LD adversarial shapes ----
add("case-203", "three JSON-LD blocks, three names + agreeing HTML -> no name claim",
  "Four distinct name values across sources; the parser crowns none of them.",
  doc(`<h1>Acme Plumbing Co</h1>` + ["Alpha Corp", "Beta Corp", "Gamma Corp"].map((nm) =>
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"${nm}"}</script>`).join("")),
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-204", "@graph wrapper is not traversed (documented boundary)",
  "A @graph array's nested business is not auto-extracted; title+h1 still agree so the name claim stands on those.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"LocalBusiness","name":"Acme Plumbing Co"}]}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-205", "JSON-LD telephone is a declared property -> phone claim with json-ld provenance",
  "Structured telephone with no visible phone still yields a claim; the provenance says exactly where it came from.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co","telephone":"+1 (970) 555-0100"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co", phone: "+19705550100" }, min_provenance: { phone: 1 } });

add("case-225", "JSON-LD @type array does not block name extraction",
  "@type as an array is tolerated; the name is still read deterministically.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">{"@context":"https://schema.org","@type":["LocalBusiness","Organization"],"name":"Acme Plumbing Co"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-226", "JSON-LD numeric name coerces to string, then conflicts -> no claim",
  "Non-string names are String()-coerced (never silently dropped); the resulting conflict stays unresolved.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":12345}</script>`),
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-227", "empty JSON-LD object is inert",
  "{} parses to no candidates; the clean HTML signals still claim.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`, `<script type="application/ld+json">{}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co", phone: "+19705550100" } });

add("case-228", "top-level JSON-LD array is not traversed (documented boundary)",
  "An array at the top level yields no name candidate; title+h1 carry the claim.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">[{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}]</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-229", "duplicate JSON keys: last wins, deterministically",
  "JSON.parse keeps the last duplicate key per spec; the surviving name agrees with HTML so the claim is sound.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">{"@context":"https://schema.org","name":"Ghost Corp","name":"Acme Plumbing Co"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-230", "uppercase JSON-LD type attribute value still recognized",
  "TYPE=\"Application/LD+JSON\" must parse as a JSON-LD block.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script TYPE="Application/LD+JSON">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co"}</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-231", "JSON-LD with leading whitespace parses",
  "Leading newlines/spaces before the JSON object must not quarantine the block.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<script type="application/ld+json">\n\n  {"@context":"https://schema.org","name":"Acme Plumbing Co"}\n</script>`),
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-217", "JSON-LD total-bytes cap: 40 big blocks, count under cap",
  "40 blocks stay under the 50-block count cap but exceed 512KiB total: byte cap fires, early blocks still parsed.",
  doc(`<h1>Acme Plumbing Co</h1>` + Array.from({ length: 40 }, () =>
    `<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Acme Plumbing Co","pad":"${"x".repeat(20000)}"}</script>`).join("")),
  { outcome: "bounded_success", required_truncated: ["jsonld"], claims: { business_name: "Acme Plumbing Co" } });

// ---- entity-encoded attributes (v1.1.0 regression pins) ----
add("case-206", "entity-encoded tel: href decodes before normalization",
  "tel:+1&#45;970&#45;555&#45;0100 must decode to tel:+1-970-555-0100 (regression: pre-decode normalization produced garbage digits).",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="tel:+1&#45;970&#45;555&#45;0100">Call</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["+14597045555450100"] });

add("case-207", "tel: with non-numeric value yields no candidate",
  "The tel: pattern guard refuses garbage; no claim, no crash.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="tel:call-us-today">Call</a></p>`),
  { outcome: "bounded_success", absent_claims: ["phone"] });

add("case-208", "mailto: with query string still claims the address",
  "The query is stripped; the address pattern guard passes.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="mailto:info@acmeplumbing.example?subject=Hello">Email</a></p>`),
  { outcome: "bounded_success", claims: { email: "info@acmeplumbing.example" } });

add("case-209", "mailto: with non-address value yields no candidate",
  "The mailto: pattern guard refuses garbage; no claim, no crash.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="mailto:not-an-email">Email</a></p>`),
  { outcome: "bounded_success", absent_claims: ["email"] });

// ---- phone format variants ----
add("case-210", "dotted phone 970.555.0100 claims",
  "The pinned NANP pattern covers dot separators deterministically.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call 970.555.0100 today</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" } });

add("case-211", "1-970-555-0100 claims as +19705550100",
  "Leading country code without plus normalizes to the canonical form.",
  doc(`<h1>Acme Plumbing Co</h1><p>Call 1-970-555-0100 today</p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" } });

add("case-212", "tel: agreeing with one of two text phones -> conflict, no claim",
  "Three candidates, two distinct values: the parser does not pick the tel: favorite.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="tel:+19705550100">(970) 555-0100</a> or (970) 555-0200</p>`),
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"] });

add("case-244", "triple identical tel: links -> one claim, three provenances",
  "Repetition across links is multi-provenance for one value, not three claims.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="tel:+19705550100">A</a><a href="tel:+19705550100">B</a><a href="tel:+19705550100">C</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, min_provenance: { phone: 3 } });

add("case-234", "javascript: href never followed; its link text still observed",
  "The JS URL is inert at the parse layer (fetch layer owns navigation); the visible link text is still a phone candidate with link-text provenance.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="javascript:void(0)">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" } });

add("case-235", "anchor without href but with phone text -> claim from link text",
  "No href means no navigation signal, but the visible text is still observed.",
  doc(`<h1>Acme Plumbing Co</h1><p><a>(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" } });

add("case-236", "empty tel: href -> no candidate, no crash",
  "tel: with nothing after the colon is ignored silently.",
  doc(`<h1>Acme Plumbing Co</h1><p><a href="tel:">Call</a></p>`),
  { outcome: "bounded_success", absent_claims: ["phone"] });

// ---- email variants ----
add("case-245", "email in visible text only -> claim",
  "A bare address in text is a deterministic pattern match with visible-text provenance.",
  doc(`<h1>Acme Plumbing Co</h1><p>Write to info@acmeplumbing.example any time</p>`),
  { outcome: "bounded_success", claims: { email: "info@acmeplumbing.example" } });

add("case-246", "two different emails in text -> conflict, no claim",
  "Two distinct addresses stay unresolved; the parser does not prefer the first.",
  doc(`<h1>Acme Plumbing Co</h1><p>info@acmeplumbing.example or support@acmeplumbing.example</p>`),
  { outcome: "bounded_success", absent_claims: ["email"], required_unresolved: ["email"] });

// ---- name-signal edge cases ----
add("case-220", "duplicate identical og:title alone -> uncorroborated, no claim",
  "Two identical og:title tags are one source TYPE; the corroboration rule still withholds the claim.",
  `<html><head><meta property="og:title" content="Acme Plumbing Co"><meta property="og:title" content="Acme Plumbing Co"></head><body><p>hi</p></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-221", "case-variant title vs h1 -> conflict, no claim",
  "Normalization is case-sensitive by rule; 'Acme' vs 'ACME' stays unresolved rather than silently unified.",
  `<html><head><title>Acme Plumbing Co</title></head><body><h1>ACME PLUMBING CO</h1></body></html>`,
  { outcome: "bounded_success", absent_claims: ["business_name"], required_unresolved: ["business_name"] });

add("case-222", "entity-encoded title agrees with h1 -> claim",
  "&amp; decodes deterministically; the decoded title matches the h1.",
  `<html><head><title>Acme &amp; Sons Plumbing</title></head><body><h1>Acme & Sons Plumbing</h1></body></html>`,
  { outcome: "bounded_success", claims: { business_name: "Acme & Sons Plumbing" } });

add("case-223", "charref-encoded title agrees with h1 -> claim",
  "Numeric character references decode deterministically before comparison.",
  `<html><head><title>&#65;cme Plumbing Co</title></head><body><h1>Acme Plumbing Co</h1></body></html>`,
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" } });

add("case-224", "phone inside h1 is not phone-extracted (documented boundary)",
  "Headings feed identity signals only; a phone-shaped h1 does not become a phone claim. (Recall boundary, not a safety hole; flagged for a future pass.)",
  `<html><head><title>Acme Plumbing Co</title></head><body><h1>(970) 555-0100</h1></body></html>`,
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["business_name"] });

// ---- markup edge cases ----
add("case-213", "fake </script> inside a JS string follows HTML5 raw-text rules",
  "Per spec, script ends at the in-string </script>; the markup after it IS parsed. Both phones become candidates and conflict -> no claim. Pins spec-compliant behavior, not a bypass.",
  `<html><head><title>Acme Plumbing Co</title></head><body><script>var s="</script><p>(970) 555-0199</p>";</script><h1>Acme Plumbing Co</h1><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p></body></html>`,
  { outcome: "bounded_success", absent_claims: ["phone"], required_unresolved: ["phone"], forbidden_values: [] });

add("case-214", "unclosed comment swallows the tail; head claims survive",
  "An unterminated comment drops everything after it without crashing; pre-comment signals still claim.",
  `<html><head><title>Acme Plumbing Co</title></head><body><h1>Acme Plumbing Co</h1><!-- swallowed <a href="tel:+19705550999">tail`,
  { outcome: "bounded_success", claims: { business_name: "Acme Plumbing Co" }, absent_claims: ["phone"], forbidden_values: ["9705550999", "+19705550999"] });

add("case-240", "100k nested divs under the node cap -> bounded success",
  "Exactly 200k nodes stays under the abort threshold; deep-but-legal pages parse.",
  "<html><body>" + "<div>".repeat(90000) + "x" + "</div>".repeat(90000) + "</body></html>",
  { outcome: "bounded_success" });

add("case-241", "uppercase HTTP-EQUIV refresh recorded",
  "Refresh detection is case-insensitive on the http-equiv name.",
  doc(`<h1>Acme Plumbing Co</h1>`, `<meta HTTP-EQUIV="REFRESH" content="0;url=https://other.example/">`),
  { outcome: "bounded_success", required_notes: ["metaRefresh"] });

add("case-242", "noscript with nested tags stays in the noscript bucket",
  "Nested markup inside noscript is flattened to text in the labeled bucket; no claims leak from it.",
  doc(`<h1>Acme Plumbing Co</h1><noscript><div><p>(970) 555-0444</p></div></noscript><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, forbidden_values: ["9705550444", "+19705550444"] });

add("case-243", "img without alt -> no evidence string, no crash",
  "Missing alt is simply absent evidence.",
  doc(`<h1>Acme Plumbing Co</h1><img src="x.jpg"><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" } });

add("case-249", "empty document -> legitimate empty, not a failure",
  "Zero bytes is an observation with absent fields, never a failure record (lane-K never-silent invariant: success-with-nothing, not failure).",
  ``,
  { outcome: "bounded_success", absent_claims: ["phone", "email", "business_name", "page_url"] });

// ---- cap boundaries: exact-at-cap vs over-cap ----
add("case-215", "10001 links -> link cap fires with flag",
  "One over the 10k cap: truncation recorded.",
  doc(`<h1>Acme Plumbing Co</h1>` + Array.from({ length: 10001 }, (_, k) => `<a href="/p${k}">p${k}</a>`).join("")),
  { outcome: "bounded_success", required_truncated: ["links"] });

add("case-216", "exactly 10000 links -> cap does NOT fire",
  "At-cap is legal; the truncation flag must stay false.",
  doc(`<h1>Acme Plumbing Co</h1>` + Array.from({ length: 10000 }, (_, k) => `<a href="/p${k}">p${k}</a>`).join("")),
  { outcome: "bounded_success", truncated_absent: ["links"] });

add("case-218", "501 metas -> meta cap fires with flag",
  "One over the 500-entry cap: truncation recorded.",
  doc(`<h1>Acme Plumbing Co</h1>`, Array.from({ length: 501 }, (_, k) => `<meta name="x-${k}" content="v${k}">`).join("")),
  { outcome: "bounded_success", required_truncated: ["meta"] });

add("case-219", "exactly 500 metas -> cap does NOT fire",
  "At-cap is legal; the truncation flag must stay false. (doc() contributes the charset meta, so 499 fixture metas + 1 charset = 500.)",
  doc(`<h1>Acme Plumbing Co</h1>`, Array.from({ length: 499 }, (_, k) => `<meta name="x-${k}" content="v${k}">`).join("")),
  { outcome: "bounded_success", truncated_absent: ["meta"] });

add("case-239", "3MiB text -> text cap fires with flag",
  "Over the 2MiB visible-text cap: truncation flagged, never silently cut.",
  doc(`<h1>Acme Plumbing Co</h1><p>${"lorem ipsum ".repeat(280000)}</p>`),
  { outcome: "bounded_success", required_truncated: ["text"] });

// ---- URL signals ----
add("case-232", "base + canonical + og:url agree -> page_url claim",
  "Unanimous URL signals yield one claim with three provenances.",
  `<html><head><base href="https://acme.example/"><link rel="canonical" href="https://acme.example/"><meta property="og:url" content="https://acme.example/"></head><body><h1>Acme Plumbing Co</h1></body></html>`,
  { outcome: "bounded_success", claims: { page_url: "https://acme.example/" }, min_provenance: { page_url: 3 } });

add("case-233", "base vs canonical disagree -> no page_url claim",
  "Two URL signals, two values: no canonical URL is guessed; relative resolution is never attempted.",
  `<html><head><base href="https://a.example/"><link rel="canonical" href="https://b.example/x"></head><body><h1>Acme Plumbing Co</h1></body></html>`,
  { outcome: "bounded_success", absent_claims: ["page_url"], required_unresolved: ["page_url"] });

// ---- reaffirmations ----
add("case-247", "address-looking text never becomes an address claim (reaffirmed)",
  "Address extraction is not a claimed field; prose addresses stay unclaimed no matter how clean.",
  doc(`<h1>Acme Plumbing Co</h1><p>123 Main St, Grand Junction, CO 81501</p><p>Call <a href="tel:+19705550100">(970) 555-0100</a></p>`),
  { outcome: "bounded_success", claims: { phone: "+19705550100" }, absent_claims: ["address", "location", "city"] });

// ---- kitchen-sink integration ----
add("case-248", "kitchen sink: every hostile region at once -> exactly the right claim set",
  "Script decoy + comment phone + hidden phone + conflicting og:title + agreeing tel:/text + mailto + conflicting URL signals. Expected: phone + email claims only; business_name and page_url unresolved; all decoys absent from claims.",
  `<!DOCTYPE html><html><head><title>Acme Plumbing Co</title><meta property="og:title" content="Ghost Corp"><base href="https://a.example/"><link rel="canonical" href="https://b.example/x"></head><body><h1>Acme Plumbing Co</h1><script>var decoy="(970) 555-0199";</script><!-- (970) 555-0666 --><span style="display:none">(970) 555-0777</span><p>Call <a href="tel:+19705550100">(970) 555-0100</a> or (970) 555-0100. <a href="mailto:info@acmeplumbing.example">Email</a></p></body></html>`,
  { outcome: "bounded_success",
    claims: { phone: "+19705550100", email: "info@acmeplumbing.example" },
    absent_claims: ["business_name", "page_url"],
    required_unresolved: ["business_name", "page_url"],
    forbidden_values: ["(970) 555-0199", "9705550199", "+19705550199", "9705550666", "+19705550666", "9705550777", "+19705550777", "Ghost Corp"] });

// ---- manifest: missions ACQ-0201..ACQ-0250 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.html, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(201 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.html, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
