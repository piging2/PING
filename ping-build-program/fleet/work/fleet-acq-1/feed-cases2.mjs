#!/usr/bin/env node
// feeds fixture lab, batch 2: adversarial cases 550-599 (missions ACQ-0701..ACQ-0750).
// Doctrine unchanged: classify, bound, or quarantine; never a guess as fact.
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

add("case-550", "RSS with atom: namespaced element ignored",
  "Foreign-namespace children are not parsed; core entries claim.",
  rss(item("One", "https://a.example/1", `<atom:link href="https://a.example/feed" rel="self"/>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-551", "xml:base present but relative href still quarantined",
  "The lab does not resolve xml:base (no base guessing); relative stays relative.",
  atom(`<entry xml:base="https://a.example/"><title>x</title><link href="/rel"/></entry>`),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "relative-link" }] });

add("case-552", "guid with surrounding whitespace -> trimmed",
  "Identity whitespace is normalized before tracking.",
  rss(item("One", "https://a.example/1", "<guid>\n  g1  \n</guid>") + item("One", "https://a.example/1", "<guid>g1</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-553", "two items, same link, different guids -> dedupe by link",
  "One URL observed twice is one discovery.",
  rss(item("One", "https://a.example/1", "<guid>g1</guid>") + item("One", "https://a.example/1", "<guid>g2</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-554", "uppercase scheme HTTPS:// -> claimed",
  "Scheme match is case-insensitive per URI spec; no normalization applied.",
  rss(item("One", "HTTPS://a.example/1")),
  { outcome: "bounded_success", claims: { entry_link: "HTTPS://a.example/1" } });

add("case-555", "link with explicit port -> claimed verbatim",
  "Ports are part of the URL; no authority normalization is guessed.",
  rss(item("One", "https://a.example:8443/1")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example:8443/1" } });

add("case-556", "unicode domain claimed verbatim, no punycode guess",
  "No IDN conversion is attempted; the URL claims exactly as written.",
  rss(item("One", "https://münchen.example/1")),
  { outcome: "bounded_success", claims: { entry_link: "https://münchen.example/1" } });

add("case-557", "two-digit-year pubDate accepted",
  "Date.parse semantics; the lab does not second-guess the parser.",
  rss(item("One", "https://a.example/1", "<pubDate>Wed, 15 Jan 26 10:30:00 GMT</pubDate>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-558", "atom entry missing title -> link still claims",
  "Titles are optional metadata, not identity.",
  atom(`<entry><link href="https://a.example/1"/></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-559", "atom self + alternate links -> alternate claims",
  "rel=self is the feed address; only rel=alternate is the entry link.",
  atom(`<entry><title>x</title><link rel="self" href="https://a.example/feed"/><link rel="alternate" href="https://a.example/1"/></entry>`),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/1" }, forbidden_values: ["https://a.example/feed"] });

add("case-560", "atom enclosure-only link -> missing-link quarantine",
  "Without an alternate, there is no entry link candidate.",
  atom(`<entry><title>x</title><link rel="enclosure" href="https://a.example/e.mp3"/></entry>`),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "missing-link" }], forbidden_values: ["https://a.example/e.mp3"] });

add("case-561", "link that decodes to markup -> empty -> missing-link quarantine",
  "Entity decoding then tag stripping can erase the candidate; that is quarantine, not a claim.",
  rss(item("One", "&lt;not a url&gt;")),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "missing-link" }] });

add("case-562", "CDATA link claimed literally",
  "CDATA is literal text through the pipeline.",
  rss(`<item><title>x</title><link><![CDATA[https://a.example/1]]></link></item>`),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/1" } });

add("case-563", "comment between channel and item ignored",
  "Comments are skipped at every level.",
  rss(`<!-- separator -->` + item("One", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-564", "processing instruction inside feed skipped",
  "PIs are never entries or fields.",
  rss(`<?php echo "x"; ?>` + item("One", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-565", "pubDate before link (field order) -> claims",
  "Field order inside an entry is irrelevant.",
  rss(`<item><pubDate>Wed, 15 Jan 2026 10:30:00 +0000</pubDate><title>x</title><link>https://a.example/1</link></item>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-566", "atom updated with +05:00 offset accepted",
  "RFC3339 offsets validate.",
  atom(entry("One", "https://a.example/1", "<updated>2026-01-15T10:30:00+05:00</updated>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-567", "atom published-only date accepted",
  "published is a valid date signal; updated is not mandatory.",
  atom(entry("One", "https://a.example/1", "<published>2026-01-15T10:30:00Z</published>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-568", "rss ttl/skipHours ignored",
  "Channel-level tuning elements are not entries.",
  rss(item("One", "https://a.example/1"), `<ttl>60</ttl><skipHours><hour>0</hour></skipHours>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-569", "item author email ignored",
  "Author metadata is not a discovery signal.",
  rss(item("One", "https://a.example/1", `<author>ed@a.example</author>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-570", 'guid isPermaLink="TRUE" (uppercase) -> true',
  "The flag comparison is case-insensitive; guid==link yields one claim.",
  rss(item("One", "https://a.example/1", `<guid isPermaLink="TRUE">https://a.example/1</guid>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-571", "duplicate guid, different link -> unresolved",
  "Same identity pointing at two URLs: no canonical link is picked.",
  rss(item("One", "https://a.example/1", "<guid>g1</guid>") + item("One", "https://a.example/2", "<guid>g1</guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 2 }, required_unresolved: ["guid"] });

add("case-572", "three alternates, two identical one different -> unresolved",
  "Majority does not resolve; differing alternates are a conflict.",
  atom(`<entry><title>x</title><link rel="alternate" href="https://a.example/1"/><link rel="alternate" href="https://a.example/1"/><link rel="alternate" href="https://a.example/2"/></entry>`),
  { outcome: "bounded_success", expect_no_claims: true, required_unresolved: ["entry_link"] });

add("case-573", "link with query params claimed verbatim",
  "Query strings are part of the URL as written.",
  rss(item("One", "https://a.example/s?b=2&a=1")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/s?b=2&a=1" } });

add("case-574", "trailing-dot domain claimed verbatim",
  "No FQDN normalization is guessed.",
  rss(item("One", "https://a.example./1")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example./1" } });

add("case-575", "description iframe stripped",
  "Embedded frames never survive content extraction.",
  rss(item("One", "https://a.example/1", `<description><![CDATA[<iframe src="https://evil.example/"></iframe>text]]></description>`)),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://evil.example/"] });

add("case-576", "atom xhtml content flattened",
  "XHTML content blocks reduce to text.",
  atom(`<entry><title>x</title><link href="https://a.example/1"/><content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>hi</p></div></content></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-577", "deeply nested title markup stripped",
  "Nesting depth does not protect markup from stripping.",
  rss(`<item><title><div><span><b>Deep</b></span></div></title><link>https://a.example/1</link></item>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-578", "feed title entities decoded in notes",
  "Notes carry decoded text; they are not claims.",
  rss(item("One", "https://a.example/1")).replace("<title>Acme News</title>", "<title>Acme &amp; News</title>"),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, notes_equal: { feedTitle: "Acme & News" } });

add("case-579", "RSS 1.0 rdf:RDF root -> typed UNSUPPORTED",
  "Only RSS 2.0 and Atom are supported; other roots classify, never parse.",
  `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><channel><title>x</title></channel></rdf:RDF>`,
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-root" });

add("case-580", "rss without version attribute still parsed",
  "Root local name decides; the version attribute is not a gate.",
  `<rss><channel><title>x</title>` + item("One", "https://a.example/1") + `</channel></rss>`,
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-581", "plain http link claimed",
  "http is allowed; the scheme allowlist is http(s), not https-only.",
  rss(item("One", "http://a.example/1")),
  { outcome: "bounded_success", claims: { entry_link: "http://a.example/1" } });

add("case-582", "internal newline in link collapses to space, claimed literally",
  "Whitespace normalization is literal; the lab does not repair URLs.",
  rss(item("One", "https://a.example/\n1")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/ 1" } });

add("case-583", "two channels -> items in both claim (documented)",
  "Channel boundaries are not enforced; entries anywhere under root are entries.",
  `<rss version="2.0"><channel><title>a</title>` + item("One", "https://a.example/1") + `</channel><channel><title>b</title>` + item("Two", "https://a.example/2") + `</channel></rss>`,
  { outcome: "bounded_success", exact_claims: { entry_link: 2 } });

add("case-584", "atom empty href -> missing-link quarantine",
  "An empty href attribute is no candidate.",
  atom(`<entry><title>x</title><link rel="alternate" href=""/></entry>`),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "missing-link" }] });

add("case-585", "atom logo/icon ignored",
  "Feed-level media elements are not entries.",
  atom(entry("One", "https://a.example/1"), `<logo>https://a.example/logo.png</logo><icon>https://a.example/icon.png</icon>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, forbidden_values: ["https://a.example/logo.png"] });

add("case-586", "empty guid -> no identity tracking, link claims",
  "Empty guids are not identities.",
  rss(item("One", "https://a.example/1", "<guid></guid>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-587", "empty pubDate -> no date quarantine",
  "An absent date is not a malformed date.",
  rss(item("One", "https://a.example/1", "<pubDate></pubDate>")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-588", "bare-domain link claimed",
  "No path is required.",
  rss(item("One", "https://a.example")),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example" } });

add("case-589", "userinfo without password -> credential-link quarantine",
  "Any userinfo in the authority is secret-shaped and quarantined.",
  rss(item("One", "https://user@a.example/")),
  { outcome: "bounded_success", expect_no_claims: true, required_quarantined: [{ reason: "credential-link" }], forbidden_values: ["user@a.example"] });

add("case-590", "single-quoted atom href claimed",
  "Attribute quoting style does not matter.",
  atom(`<entry><title>x</title><link rel='alternate' href='https://a.example/1'/></entry>`),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/1" } });

add("case-591", "entity in atom href decoded once",
  "Href entities decode exactly once.",
  atom(`<entry><title>x</title><link rel="alternate" href="https://a.example/?x=1&amp;y=2"/></entry>`),
  { outcome: "bounded_success", claims: { entry_link: "https://a.example/?x=1&y=2" } });

add("case-592", "title exactly at 4KiB cap -> no truncation flag",
  "At-cap is accepted; only over-cap truncates.",
  rss(item("A".repeat(4096), "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, truncated_absent: ["fields"] });

add("case-593", "title at 4KiB+1 -> truncation flagged",
  "One byte over the cap fires the flag.",
  rss(item("A".repeat(4097), "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 }, required_truncated: ["fields"] });

add("case-594", "exactly 10000 items -> no truncation flag",
  "At-cap boundary: accepted without the flag.",
  rss(Array.from({ length: 10000 }, (_, k) => item(`t${k}`, `https://a.example/r${k}`)).join("")),
  { outcome: "bounded_success", exact_claims: { entry_link: 10000 }, truncated_absent: ["entries"] });

add("case-595", "xml:lang on entry ignored",
  "Language attributes are not parsed.",
  atom(`<entry xml:lang="en"><title>x</title><link href="https://a.example/1"/></entry>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-596", "rss docs element ignored",
  "Spec-pointer elements are not entries.",
  rss(item("One", "https://a.example/1"), `<docs>https://www.rssboard.org/rss-specification</docs>`),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-598", "duplicate atom href across entries -> dedupe",
  "Same URL in two entries is one discovery.",
  atom(entry("One", "https://a.example/1") + entry("Two", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-599", "leading whitespace before prolog accepted",
  "Whitespace before the XML declaration is legal.",
  "  \n" + rss(item("One", "https://a.example/1")),
  { outcome: "bounded_success", exact_claims: { entry_link: 1 } });

add("case-597", "feed kitchen sink 2 -> exact claim set",
  "xml:base-relative, empty-href, bad-date, guid-conflict, and extension items at once.",
  rss(
    item("One", "https://a.example/1", "<guid>g1</guid>") +
    item("Rel", "/x") +
    item("BadDate", "https://a.example/3", "<pubDate>never</pubDate>") +
    item("Conflict", "https://a.example/4", "<guid>g1</guid>") +
    item("Ext", "https://a.example/5", "<dc:creator>z</dc:creator><itunes:duration>9</itunes:duration>")
  ),
  { outcome: "bounded_success",
    exact_claims: { entry_link: 4 },
    required_quarantined: [{ reason: "relative-link" }, { reason: "bad-date" }],
    required_unresolved: ["guid"] });

// ---- manifest: missions ACQ-0701..ACQ-0750 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.xml, "utf8").digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(701 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: Buffer.byteLength(c.xml, "utf8"), expect: c.expect };
});
const manifest2 = manifest;

export { C, manifest, manifest2 };
export function getCase(id) { return C.find((c) => c.id === id); }
