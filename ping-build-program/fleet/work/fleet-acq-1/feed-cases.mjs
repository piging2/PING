#!/usr/bin/env node
// feeds fixture lab: adversarial cases 500-549 (missions ACQ-0651..ACQ-0700).
// Doctrine: classify, bound, or quarantine; never convert a parser guess into
// a canonical fact. entry_link claims need absolute http(s) links.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, xml, expect) => C.push({ id, title, threat, xml, expect });

const rss = (items, chanExtra = "") =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>Acme News</title><link>https://a.example/</link>${chanExtra}${items}</channel></rss>`;
const item = (title, link, extra = "") =>
  `<item><title>${title}</title><link>${link}</link>${extra}</item>`;
const atom = (entries, feedExtra = "") =>
  `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Acme News</title>${feedExtra}${entries}</feed>`;
const entry = (title, href, extra = "") =>
  `<entry><title>${title}</title><link href="${href}"/>${extra}</entry>`;

// ---- happy paths ----
add("case-500", "clean RSS, 3 items -> 3 entry_link claims",
  "Baseline: absolute links claim with per-entry provenance.",
  rss(item("One", "https://a.example/1") + item("Two", "https://a.example/2") + item("Three", "https://a.example/3")),
  { outcome: "bounded_success", exact_claims: { entry_link: 3 } });

add("case-501", "clean Atom, 2 entries -> 2 claims",
  "Atom rel=alternate href is the link signal.",
  atom(entry("One", "https://a.example/1") + entry("Two", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 2 } });

add("case-520", "empty channel -> legitimate empty",
  "Zero entries is an observation, not a failure.",
  rss(""),
  { outcome: "bounded_success", expect_no_claims: true });

add("case-528", "BOM -> stripped, accepted",
  "\uFEFF" + rss(item("One", "https://a.example/1")),
  "﻿" + rss(item("One", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

// ---- fail-closed XML ----
add("case-502", "XXE doctype -> typed INVALID_PAYLOAD",
  "Fail closed before any entity is processed.",
  `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` + rss(item("&xxe;", "https://a.example/1")),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "doctype-decl-not-processed" });

add("case-503", "billion-laughs doctype -> typed INVALID_PAYLOAD",
  "Entity attacks die at the doctype gate.",
  `<!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]>` + rss(item("x", "https://a.example/1")),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "doctype-decl-not-processed" });

add("case-504", "HTML as feed -> typed UNSUPPORTED",
  "Non-feed root is classified, never parsed as tag soup.",
  `<html><body><a href="https://a.example/1">x</a></body></html>`,
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-root" });

add("case-505", "gzip-magic -> typed UNSUPPORTED",
  "Binary input is classified; never decompressed in the lab.",
  "\x1f\x8bfake-gzip-bytes",
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "gzip-magic" });

add("case-506", "6MB feed -> typed PERMANENT",
  "Bound violation is a typed terminal failure.",
  rss(item("x", "https://a.example/1") + `<item><title>t</title><link>https://a.example/${"p".repeat(1024)}</link></item>`.repeat(6000)),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "doc-bytes-over-cap" });

add("case-549", "empty input -> typed UNSUPPORTED",
  "No root element is classified, not an empty success.",
  ``,
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-root" });

// ---- link quarantines ----
add("case-507", "relative link quarantined; absolute claims",
  "Field isolation: the bad entry dies, the good one claims.",
  rss(item("Bad", "/relative/1") + item("Good", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "relative-link" }] });

add("case-508", "javascript: link -> bad-scheme quarantine",
  "Non-http(s) schemes are never navigation candidates.",
  rss(item("Bad", "javascript:alert(1)") + item("Good", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "bad-scheme-link" }], forbidden_values: ["javascript:alert(1)"] });

add("case-510", "item without link -> missing-link quarantine",
  "An entry with no identity signal is quarantined, not attached to a neighbor.",
  rss(`<item><title>No link</title></item>` + item("Good", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "missing-link" }] });

add("case-514", "atom link without href -> missing-link quarantine",
  "An href-less link element yields no candidate.",
  atom(`<entry><title>No href</title><link rel="alternate"/></entry>` + entry("Good", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "missing-link" }] });

add("case-535", "atom relative href -> relative-link quarantine",
  "Relative hrefs quarantine exactly like relative RSS links.",
  atom(entry("Good", "https://a.example/2") + `<entry><title>Bad</title><link href="/relative"/></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "relative-link" }] });

add("case-546", "credential-bearing link -> quarantined with redaction",
  "Secret-shaped: quarantined, detail redacted per the credentials rule.",
  rss(item("Bad", "https://user:s3cret@a.example/x") + item("Good", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "credential-link" }], forbidden_values: ["s3cret"] });

add("case-521", "uppercase tags not recognized (XML case-sensitivity)",
  "Strict per XML: <ITEM> is not an entry; nothing claims.",
  `<rss version="2.0"><channel><ITEM><TITLE>x</TITLE><LINK>https://a.example/1</LINK></ITEM></channel></rss>`,
  { outcome: "bounded_success", expect_no_claims: true, forbidden_values: ["https://a.example/1"] });

add("case-532", "link with whitespace -> trimmed, claimed",
  "Whitespace is normalized, never part of the URL.",
  rss(item("One", "\n  https://a.example/1  \n")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/1" } });

add("case-547", "fragment kept verbatim (documented)",
  "The link claims as written; no fragment stripping is guessed.",
  rss(item("One", "https://a.example/1#sec")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/1#sec" } });

// ---- dates ----
add("case-509", "bad pubDate quarantined; link still claims",
  "Date validation failure does not poison the link discovery.",
  rss(item("One", "https://a.example/1", "<pubDate>not-a-date</pubDate>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "bad-date" }] });

add("case-525", "RFC822 pubDate variants accepted",
  "Day-name and numeric-zone forms validate.",
  rss(item("One", "https://a.example/1", "<pubDate>Wed, 15 Jan 2026 10:30:00 +0000</pubDate>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-526", "atom RFC3339 updated accepted",
  "Full datetime validates for atom.",
  atom(entry("One", "https://a.example/1", "<updated>2026-01-15T10:30:00Z</updated>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-527", "bad atom updated quarantined",
  "Malformed updated is quarantined per-entry.",
  atom(entry("One", "https://a.example/1", "<updated>yesterday</updated>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "bad-date" }] });

add("case-541", "future pubDate accepted with note",
  "Unusual but legal; the lab does not police the calendar.",
  rss(item("One", "https://a.example/1", "<pubDate>Wed, 15 Jan 2031 10:30:00 +0000</pubDate>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

// ---- identity: guid and alternates ----
add("case-511", "duplicate guid, identical content -> dedupe, one claim",
  "Same guid and same content is one entry observed twice.",
  rss(item("One", "https://a.example/1", "<guid>abc</guid>") + item("One", "https://a.example/1", "<guid>abc</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-512", "duplicate guid, different title -> unresolved guid conflict",
  "Same identity, different content: no canonical version is picked.",
  rss(item("One", "https://a.example/1", "<guid>abc</guid>") + item("Two", "https://a.example/1", "<guid>abc</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_unresolved: ["guid"] });

add("case-513", "two differing atom alternates -> unresolved",
  "No preferred alternate is guessed.",
  atom(`<entry><title>x</title><link rel="alternate" href="https://a.example/1"/><link rel="alternate" href="https://a.example/2"/></entry>`),
  { outcome: "bounded_success", expect_no_claims: true, required_unresolved: ["entry_link"] });

add("case-515", "guid isPermaLink=false -> opaque, never a link claim",
  "An opaque guid is identity, not navigation.",
  rss(item("One", "https://a.example/1", `<guid isPermaLink="false">urn:uuid:1234</guid>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["urn:uuid:1234"] });

add("case-533", "guid equal to link -> single claim, no double count",
  "The default permaLink guid duplicates the link; one claim results.",
  rss(item("One", "https://a.example/1", "<guid>https://a.example/1</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-534", "atom id as urn:uuid -> opaque, link still claims",
  "Atom ids are opaque by spec; the href carries the claim.",
  atom(entry("One", "https://a.example/1", "<id>urn:uuid:1234</id>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["urn:uuid:1234"] });

add("case-545", "rss guid differing from link -> guid is evidence only",
  "Only the link claims; the guid never becomes an entry_link.",
  rss(item("One", "https://a.example/1", "<guid>https://other.example/x</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://other.example/x"] });

// ---- content handling ----
add("case-516", "content:encoded with script -> script stripped, link claims",
  "Embedded scripts never survive content extraction.",
  rss(item("One", "https://a.example/1", `<content:encoded><![CDATA[<p>hi</p><script>alert(1)</script>]]></content:encoded>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-517", "CDATA description extracted literally",
  "CDATA is literal text through the pipeline.",
  rss(item("One", "https://a.example/1", `<description><![CDATA[<p>Fish &amp; Chips</p>]]></description>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-518", "comment with fake items ignored",
  "Comments never become entries.",
  rss(`<!--<item><title>Fake</title><link>https://evil.example/</link></item>-->` + item("One", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://evil.example/"] });

add("case-522", "enclosure is evidence only",
  "Enclosure URLs are counted, never claimed as entry links.",
  rss(item("One", "https://a.example/1", `<enclosure url="https://a.example/ep.mp3" type="audio/mpeg"/>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_notes: ["enclosures"], forbidden_values: ["https://a.example/ep.mp3"] });

add("case-531", "title with inner HTML tags -> stripped",
  "Titles are text; markup inside is removed, not rendered.",
  rss(`<item><title><b>Bold</b> News</title><link>https://a.example/1</link></item>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-543", "atom content type=html -> tags stripped",
  "HTML content is flattened to text.",
  atom(`<entry><title>x</title><link href="https://a.example/1"/><content type="html">&lt;p&gt;hi&lt;/p&gt;</content></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-544", "atom content with src -> external, never fetched",
  "External content references are noted, not dereferenced.",
  atom(`<entry><title>x</title><link href="https://a.example/1"/><content src="https://cdn.example/x.html"/></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_notes: ["externalContent"] });

add("case-539", "description-only item (no title) -> link still claims",
  "A missing title does not block link discovery.",
  rss(`<item><description>just text</description><link>https://a.example/1</link></item>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-540", "10KB title -> field truncation flagged",
  "Over the 4KiB text cap: truncation flagged, entry still processed.",
  rss(item("A".repeat(10000), "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_truncated: ["fields"] });

// ---- structural ----
add("case-530", "nested item -> nested-entry quarantine",
  "Nesting is not a second entry.",
  rss(`<item><title>x</title><link>https://a.example/1</link><item><title>y</title><link>https://a.example/2</link></item></item>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_quarantined: [{ reason: "nested-entry" }] });

add("case-523", "itunes extension ignored",
  "Extension namespaces are not parsed; core entries claim.",
  rss(item("One", "https://a.example/1", `<itunes:duration>300</itunes:duration>`),
    `<itunes:author>x</itunes:author>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-537", "channel image extras ignored",
  "Non-entry channel children are not entries.",
  rss(item("One", "https://a.example/1"), `<image><url>https://a.example/i.png</url></image>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://a.example/i.png"] });

add("case-542", "two concatenated feeds -> first root parsed, tail ignored",
  "The lab parses one document; trailing roots are not re-entered (documented).",
  rss(item("One", "https://a.example/1")) + rss(item("Two", "https://a.example/2")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://a.example/2"] });

add("case-529", "entity-encoded link decoded once",
  "&amp; decodes to & in the claimed URL.",
  rss(item("One", "https://a.example/?x=1&amp;y=2")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/?x=1&y=2" } });

// ---- caps ----
add("case-519", "10001 items -> entry cap fires, first 10k claim",
  "Over the 10k cap: truncation flagged, head entries honored.",
  rss(Array.from({ length: 10001 }, (_, k) => item(`t${k}`, `https://a.example/p${k}`)).join("")),
  { outcome: "bounded_success", required_truncated: ["entries"], exact_claims: { entry_link: 10000 } });

add("case-548", "60000 items -> cap holds at 10k",
  "Well under the 5MB doc cap but over the entry cap: truncation, not failure.",
  rss(Array.from({ length: 60000 }, (_, k) => item(`t${k}`, `https://a.example/q${k}`)).join("")),
  { outcome: "bounded_success", required_truncated: ["entries"], exact_claims: { entry_link: 10000 } });

// ---- kitchen sink ----
add("case-524", "dc:creator extension ignored",
  "Dublin-core extensions are not parsed; core entries claim.",
  rss(item("One", "https://a.example/1", `<dc:creator>Someone</dc:creator>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-538", "multiple categories ignored",
  "Category children are not entries and never claim.",
  rss(item("One", "https://a.example/1", `<category>news</category><category>tech</category>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-536", "feed kitchen sink -> exact claim set",
  "Valid, relative, bad-date, duplicate-guid, CDATA, comment-fake, and bad-scheme items at once.",
  rss(
    item("One", "https://a.example/1", "<guid>g1</guid><pubDate>Wed, 15 Jan 2026 10:30:00 +0000</pubDate>") +
    item("Bad", "/relative", "<guid>g2</guid>") +
    item("BadDate", "https://a.example/3", "<pubDate>soon</pubDate>") +
    item("Dup", "https://a.example/1", "<guid>g1</guid>") +
    `<!--<item><title>F</title><link>https://evil.example/</link></item>-->` +
    item("BadScheme", "ftp://a.example/x")
  ),
  { outcome: "bounded_success",
    exact_claims: { entry_link: 2 },
    required_quarantined: [{ reason: "relative-link" }, { reason: "bad-date" }, { reason: "bad-scheme-link" }],
    forbidden_values: ["https://evil.example/", "ftp://a.example/x"] });

// ---- manifest: missions ACQ-0651..ACQ-0700 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.xml, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(651 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.xml, "utf8"), expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
