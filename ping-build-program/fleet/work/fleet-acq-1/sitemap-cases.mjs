#!/usr/bin/env node
// sitemaps fixture lab: adversarial cases 400-449 (missions ACQ-0601..ACQ-0650).
// Doctrine: classify, bound, or quarantine; never convert a parser guess into
// a canonical fact. A discovered_url claim needs an absolute http(s) loc;
// everything else is a typed quarantine or a typed failure.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, xml, expect) => C.push({ id, title, threat, xml, expect });

const sm = (body, rootAttrs = ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset${rootAttrs}>${body}</urlset>`;
const url = (loc, extra = "") => `<url><loc>${loc}</loc>${extra}</url>`;
const idx = (body) =>
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;

// ---- happy paths ----
add("case-400", "clean urlset, 3 URLs -> 3 discovered_url claims",
  "Baseline: absolute http(s) locs claim with per-entry provenance.",
  sm(url("https://a.example/") + url("https://a.example/about", "<lastmod>2026-01-15</lastmod>") + url("https://a.example/contact")),
  { outcome: "bounded_success", min_claims: { discovered_url: 3 } });

add("case-412", "urlset without namespace -> accepted",
  "The namespace is not required for extraction (documented leniency).",
  `<urlset>${url("https://a.example/")}</urlset>`,
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-414", "empty urlset -> legitimate empty, not a failure",
  "Zero entries is an observation with absent fields, never a failure record.",
  sm(""),
  { outcome: "bounded_success", expect_no_claims: true });

add("case-432", "XML declaration with encoding -> accepted",
  "Prolog processing instructions are skipped, not parsed.",
  `<?xml version="1.0" encoding="UTF-8"?>` + sm(url("https://a.example/")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-433", "UTF-8 BOM -> stripped, accepted",
  "A leading BOM does not break root detection.",
  "﻿" + sm(url("https://a.example/")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

// ---- fail-closed XML ----
add("case-401", "XXE doctype -> typed INVALID_PAYLOAD, zero claims",
  "Fail closed before any entity is processed: the doctype never reaches expansion.",
  `<?xml version="1.0"?><!DOCTYPE urlset [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><urlset><url><loc>&xxe;</loc></url></urlset>`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "doctype-decl-not-processed" });

add("case-402", "billion-laughs doctype -> typed INVALID_PAYLOAD",
  "Entity-declaration attacks die at the doctype gate; expansion is never attempted.",
  `<!DOCTYPE lolz [<!ENTITY lol "lollollollollollollollol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;">]><urlset><url><loc>&lol2;</loc></url></urlset>`,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "doctype-decl-not-processed" });

add("case-413", "HTML document as sitemap -> typed UNSUPPORTED",
  "A non-sitemap root is classified, never parsed as tag soup.",
  `<html><body><a href="https://a.example/">x</a></body></html>`,
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-root" });

add("case-418", "6MB document -> typed PERMANENT (doc-bytes cap)",
  "Bound violation is a typed terminal failure, not a silent truncation.",
  sm(url("https://a.example/") + `<url><loc>https://a.example/${"p".repeat(1024)}</loc></url>`.repeat(6000)),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "doc-bytes-over-cap" });

add("case-446", "gzip-magic bytes -> typed UNSUPPORTED, never decompressed",
  "Binary input is classified; the lab never shells to a decompressor.",
  "\x1f\x8bfake-gzip-bytes",
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "gzip-magic" });

// ---- loc validation quarantines ----
add("case-404", "relative locs quarantined; absolute still claims",
  "Field isolation: the bad entries die, the good one claims.",
  sm(url("https://a.example/ok") + url("/relative/path") + url("contact")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "relative-loc" }] });

add("case-419", "javascript: loc -> bad-scheme quarantine",
  "Non-http(s) schemes are never navigation candidates.",
  sm(url("https://a.example/") + url("javascript:alert(1)")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-scheme-loc" }], forbidden_values: ["javascript:alert(1)"] });

add("case-420", "credential-bearing loc -> quarantined with redaction",
  "user:pass@ is secret-shaped: quarantined, and the detail is redacted per the credentials rule.",
  sm(url("https://a.example/") + url("https://user:s3cret@a.example/private")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "credential-loc" }], forbidden_values: ["s3cret"] });

add("case-428", "empty loc -> missing-loc quarantine",
  "An empty loc is not a URL.",
  sm(url("https://a.example/") + `<url><loc>   </loc></url>`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "missing-loc" }] });

add("case-429", "url entry with lastmod but no loc -> missing-loc quarantine",
  "Metadata without an identity is quarantined, not attached to a neighbor.",
  sm(url("https://a.example/") + `<url><lastmod>2026-01-15</lastmod></url>`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "missing-loc" }] });

add("case-430", "orphan loc outside any url -> ignored with note",
  "A loc with no entry is not a discovery; counted, never claimed.",
  sm(`<loc>https://a.example/orphan</loc>` + url("https://a.example/")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, notes_equal: { orphanLocs: 1 }, forbidden_values: ["https://a.example/orphan"] });

add("case-421", "uppercase tags are not recognized (XML case-sensitivity)",
  "Strict per XML: <URL>/<LOC> are not entries; nothing is claimed, nothing crashes.",
  `<urlset><URL><LOC>https://a.example/</LOC></URL></urlset>`,
  { outcome: "bounded_success", expect_no_claims: true, forbidden_values: ["https://a.example/"] });

// ---- optional-field validation (field isolation) ----
add("case-405", "bad lastmod quarantined; loc still claims",
  "lastmod validation failure does not poison the URL discovery.",
  sm(url("https://a.example/", "<lastmod>not-a-date</lastmod>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-lastmod" }] });

add("case-406", "bad changefreq quarantined; loc still claims",
  "The enum is pinned; 'sometimes' is not in it.",
  sm(url("https://a.example/", "<changefreq>sometimes</changefreq>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-changefreq" }] });

add("case-407", "bad priority quarantined; loc still claims",
  "Priority outside 0.0-1.0 is quarantined per-entry.",
  sm(url("https://a.example/", "<priority>high</priority>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-priority" }] });

add("case-422", "date-only lastmod accepted",
  "W3C allows YYYY-MM-DD; the pin covers it.",
  sm(url("https://a.example/", "<lastmod>2026-01-15</lastmod>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-423", "lastmod with timezone accepted",
  "Full datetime with offset validates.",
  sm(url("https://a.example/", "<lastmod>2026-01-15T10:30:00+07:00</lastmod>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-424", "priority '1' accepted",
  "Integer 1 is within 0.0-1.0.",
  sm(url("https://a.example/", "<priority>1</priority>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-425", "priority '1.5' quarantined",
  "Above the 1.0 ceiling: quarantined.",
  sm(url("https://a.example/", "<priority>1.5</priority>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-priority" }] });

add("case-426", "changefreq 'sometimes' quarantined (explicit)",
  "Only the seven pinned values pass.",
  sm(url("https://a.example/", "<changefreq>sometimes</changefreq><priority>0.5</priority>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "bad-changefreq" }] });

add("case-440", "future lastmod accepted with note",
  "Future dates are unusual but legal; noted, not rejected.",
  sm(url("https://a.example/", "<lastmod>2030-01-01</lastmod>")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, notes_equal: { futureLastmod: 1 } });

// ---- duplicates and conflicts ----
add("case-408", "triple duplicate loc -> one claim, duplicates counted",
  "Dedupe is not a conflict: one claim, extras noted.",
  sm(url("https://a.example/") + url("https://a.example/") + url("https://a.example/")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, exact_claims: { discovered_url: 1 }, notes_equal: { duplicateLocs: 2 } });

add("case-409", "same loc, two lastmods -> unresolved lastmod, one URL claim",
  "The URL is discovered once; no canonical lastmod is picked.",
  sm(url("https://a.example/", "<lastmod>2026-01-01</lastmod>") + url("https://a.example/", "<lastmod>2026-02-01</lastmod>")),
  { outcome: "bounded_success", exact_claims: { discovered_url: 1 }, required_unresolved: ["lastmod"] });

// ---- structural edge cases ----
add("case-403", "unclosed url entry swallows tail -> missing-loc quarantine",
  "The well-formed entry claims; the unclosed entry has no loc and is quarantined.",
  sm(url("https://a.example/ok") + `<url><lastmod>2026-01-01</lastmod>`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "missing-loc" }] });

add("case-411", "nested url inside url -> nested-entry quarantine",
  "Nesting is not a second entry; the inner region is quarantined.",
  sm(`<url><loc>https://a.example/</loc><url><loc>https://a.example/inner</loc></url></url>`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, required_quarantined: [{ reason: "nested-entry" }], required_notes: ["nestedUrl"] });

add("case-415", "CDATA loc extracted literally",
  "CDATA content is literal text, then entity-decoded.",
  sm(`<url><loc><![CDATA[https://a.example/?x=1&y=2]]></loc></url>`),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/?x=1&y=2" } });

add("case-416", "comment with fake entries ignored",
  "Comments never become entries, even when they look like entries.",
  sm(`<!--<url><loc>https://evil.example/</loc></url>-->` + url("https://a.example/")),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 }, forbidden_values: ["https://evil.example/"] });

add("case-427", "loc with surrounding whitespace -> trimmed, claimed",
  "Whitespace is normalized, never part of the URL.",
  sm(url("\n  https://a.example/  \n")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/" } });

add("case-434", "entity-encoded loc decoded once",
  "&amp; decodes to &; the claimed URL is the decoded form.",
  sm(url("https://a.example/?x=1&amp;y=2")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/?x=1&y=2" } });

add("case-435", "double-encoded entity decoded exactly once",
  "Single-pass decoding: &amp;amp; becomes &amp;, not & (documented).",
  sm(url("https://a.example/?x=1&amp;amp;y=2")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/?x=1&amp;y=2" } });

// ---- sitemap indexes ----
add("case-410", "sitemapindex -> index entries are evidence, not URL claims",
  "An index lists sitemaps, not pages: zero discovered_url claims, two index notes.",
  idx(`<sitemap><loc>https://a.example/s1.xml</loc></sitemap><sitemap><loc>https://a.example/s2.xml</loc></sitemap>`),
  { outcome: "bounded_success", expect_no_claims: true, required_notes: ["indexEntries"] });

add("case-431", "sitemapindex entry without loc -> index-missing-loc quarantine",
  "A sitemap entry with no loc is quarantined, not skipped silently.",
  idx(`<sitemap><lastmod>2026-01-01</lastmod></sitemap>`),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "index-missing-loc" }] });

// ---- extension namespaces ignored ----
add("case-438", "news extension tags ignored; core entries claim",
  "Extension namespaces are not parsed (documented); url/loc still extract.",
  sm(`<url><loc>https://a.example/</loc><news:news><news:publication><news:name>X</news:name></news:publication></news:news></url>`,
    ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

add("case-439", "xhtml:link hreflang ignored",
  "Alternate-link annotations are not identity signals.",
  sm(`<url><loc>https://a.example/</loc><xhtml:link rel="alternate" hreflang="es" href="https://a.example/es"/></url>`,
    ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"`),
  { outcome: "bounded_success", exact_claims: { discovered_url: 1 }, forbidden_values: ["https://a.example/es"] });

// ---- no-normalization pins ----
add("case-441", "trailing-slash variants are distinct URLs",
  "No slash normalization is guessed: /about and /about/ are two claims.",
  sm(url("https://a.example/about") + url("https://a.example/about/")),
  { outcome: "bounded_success", exact_claims: { discovered_url: 2 } });

add("case-442", "http vs https are distinct URLs",
  "No scheme upgrade is guessed.",
  sm(url("http://a.example/") + url("https://a.example/")),
  { outcome: "bounded_success", exact_claims: { discovered_url: 2 } });

add("case-443", "fragment kept verbatim (documented)",
  "The loc is claimed as written; no fragment stripping is guessed.",
  sm(url("https://a.example/#top")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/#top" } });

add("case-444", "query string kept verbatim",
  "Query strings are part of the claimed URL as written.",
  sm(url("https://a.example/?a=1&b=2")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example/?a=1&b=2" } });

add("case-445", "punycode vs unicode domains are distinct, verbatim",
  "No IDNA normalization is guessed; both forms claim as written.",
  sm(url("https://xn--exmple-cua.example/") + url("https://exämple.example/")),
  { outcome: "bounded_success", exact_claims: { discovered_url: 2 } });

add("case-447", "loc with port claimed verbatim",
  "Ports are part of the URL as written.",
  sm(url("https://a.example:8443/")),
  { outcome: "bounded_success", claims: { discovered_url: "https://a.example:8443/" } });

add("case-448", "uppercase scheme accepted (RFC: scheme is case-insensitive)",
  "HTTP:// matches the http(s) gate case-insensitively; the value claims verbatim.",
  sm(url("HTTP://a.example/")),
  { outcome: "bounded_success", claims: { discovered_url: "HTTP://a.example/" } });

add("case-449", "urlset with extra attributes accepted",
  "Foreign attributes on the root do not block parsing.",
  sm(url("https://a.example/"), ` xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xml:lang="en"`),
  { outcome: "bounded_success", min_claims: { discovered_url: 1 } });

// ---- caps ----
add("case-417", "10001 entries -> entry cap fires, first 10k claim",
  "Over the 10k cap: truncation flagged, head entries honored.",
  sm(Array.from({ length: 10001 }, (_, k) => url(`https://a.example/p${k}`)).join("")),
  { outcome: "bounded_success", required_truncated: ["entries"], exact_claims: { discovered_url: 10000 } });

add("case-436", "60000 entries -> cap holds at 10k",
  "Well under the 5MB doc cap but over the entry cap: truncation, not failure.",
  sm(Array.from({ length: 60000 }, (_, k) => url(`https://a.example/q${k}`)).join("")),
  { outcome: "bounded_success", required_truncated: ["entries"], exact_claims: { discovered_url: 10000 } });

// ---- kitchen sink ----
add("case-437", "sitemap kitchen sink -> exact claim set",
  "Valid, relative, bad-lastmod, duplicate, CDATA, comment-fake, and bad-scheme entries at once: exactly the valid absolute locs claim.",
  sm(
    url("https://a.example/") +
    url("/relative") +
    url("https://a.example/news", "<lastmod>never</lastmod>") +
    url("https://a.example/") +
    `<url><loc><![CDATA[https://a.example/?x=1&y=2]]></loc></url>` +
    `<!--<url><loc>https://evil.example/</loc></url>-->` +
    url("ftp://a.example/file")
  ),
  { outcome: "bounded_success",
    exact_claims: { discovered_url: 3 },
    required_quarantined: [{ reason: "relative-loc" }, { reason: "bad-lastmod" }, { reason: "bad-scheme-loc" }],
    notes_equal: { duplicateLocs: 1 },
    forbidden_values: ["https://evil.example/", "ftp://a.example/file"] });

// ---- manifest: missions ACQ-0601..ACQ-0650 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.xml, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(601 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.xml, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
