#!/usr/bin/env python3
"""fleet-acq-2: sitemap fixtures (missions ACQ-0551..ACQ-0600, sitemap cases 0-49).
XML hardening: entity-expansion attacks, hostile locs, malformed XML, spec violations."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "sitemap")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, xml, expect, note, flags=(), verbatim=(), raw=False):
    CASES.append({"case": case, "mission_no": 551 + case, "slug": slug, "bound": "SITEMAP",
                  "xml": xml, "raw": raw, "expect": expect, "note": note,
                  "expect_flags": list(flags), "verbatim": list(verbatim)})

URL = lambda loc, extra="": f"<url><loc>{loc}</loc>{extra}</url>"
HDR = '<?xml version="1.0" encoding="UTF-8"?>'
NS = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
IDX = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

add(0, "valid-urlset", HDR + NS + URL("https://a.example/") + URL("https://a.example/about") + "</urlset>",
    "BOUNDED_SUCCESS", "valid urlset: locs recorded as untrusted refs", flags=["untrusted_ref"])
add(1, "valid-index", HDR + IDX + "<sitemap><loc>https://a.example/s1.xml</loc></sitemap>" + "</sitemapindex>",
    "BOUNDED_SUCCESS", "valid sitemapindex: child sitemap refs recorded, not fetched", flags=["child_unfetched"])
add(2, "xxe-file", HDR + '<!DOCTYPE urlset [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' + NS + URL("&xxe;") + "</urlset>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "XXE: DOCTYPE/entity rejected, whole doc quarantined", flags=["entity_rejected"])
add(3, "billion-laughs", HDR + '<!DOCTYPE l [<!ENTITY a "' + "x"*100 + '">' +
    "".join(f'<!ENTITY a{i} "' + "&a;"*10 + '">' for i in range(1, 8)) + ']>' + NS + URL("&a7;") + "</urlset>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "entity expansion bomb rejected at DOCTYPE", flags=["entity_rejected"])
add(4, "param-entity", HDR + '<!DOCTYPE urlset [<!ENTITY % pe "<!ENTITY x \'boom\'>"> %pe;]>' + NS + URL("https://a.example/") + "</urlset>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "parameter entities rejected", flags=["entity_rejected"])
add(5, "malformed-xml", HDR + NS + URL("https://a.example/") + "<url><loc>unclosed",
    "TYPED_FAILURE:INVALID_PAYLOAD", "truncated XML: no partial URL claims", flags=["quarantined"])
add(6, "not-xml-html", "<html><body>not a sitemap</body></html>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "HTML served as sitemap: rejected, not parsed as tag soup", flags=["not_xml"])
add(7, "empty-doc", "", "TYPED_FAILURE:INVALID_PAYLOAD",
    "empty doc: INVALID_PAYLOAD, not silent empty success", flags=["empty_input"])
add(8, "whitespace-only", "   \n  ", "TYPED_FAILURE:INVALID_PAYLOAD",
    "whitespace-only: INVALID_PAYLOAD", flags=["empty_input"])
add(9, "js-loc", HDR + NS + URL("javascript:evil()") + "</urlset>",
    "BOUNDED_SUCCESS", "javascript: loc dropped per scheme allowlist", flags=["scheme_dropped"])
add(10, "data-loc", HDR + NS + URL("data:text/html,x") + "</urlset>",
    "BOUNDED_SUCCESS", "data: loc dropped", flags=["scheme_dropped"])
add(11, "relative-loc", HDR + NS + URL("/about") + "</urlset>",
    "BOUNDED_SUCCESS", "relative loc: unresolved_ref, never resolved by guess", flags=["unresolved_ref"])
add(12, "loc-whitespace", HDR + NS + URL("  https://a.example/  ") + "</urlset>",
    "BOUNDED_SUCCESS", "loc whitespace preserved verbatim with flag", flags=["whitespace_value"])
add(13, "loc-uppercase-scheme", HDR + NS + URL("HTTPS://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "uppercase scheme recorded verbatim", verbatim=["HTTPS://a.example/"])
add(14, "lastmod-words", HDR + NS + URL("https://a.example/", "<lastmod>yesterday</lastmod>") + "</urlset>",
    "BOUNDED_SUCCESS", "lastmod verbatim, never parsed to datetime", flags=["format_suspect"])
add(15, "lastmod-valid", HDR + NS + URL("https://a.example/", "<lastmod>2026-09-23</lastmod>") + "</urlset>",
    "BOUNDED_SUCCESS", "valid lastmod kept as claimed string")
add(16, "priority-2", HDR + NS + URL("https://a.example/", "<priority>2.5</priority>") + "</urlset>",
    "BOUNDED_SUCCESS", "priority 2.5 out of range: flagged, verbatim", flags=["range_suspect"])
add(17, "priority-words", HDR + NS + URL("https://a.example/", "<priority>high</priority>") + "</urlset>",
    "BOUNDED_SUCCESS", "priority words verbatim", flags=["format_suspect"])
add(18, "changefreq-bogus", HDR + NS + URL("https://a.example/", "<changefreq>sometimes</changefreq>") + "</urlset>",
    "BOUNDED_SUCCESS", "bogus changefreq verbatim, never normalized", flags=["invalid_enum"])
add(19, "changefreq-valid", HDR + NS + URL("https://a.example/", "<changefreq>daily</changefreq>") + "</urlset>",
    "BOUNDED_SUCCESS", "valid changefreq kept as claimed")
add(20, "url-60k", HDR + NS + "".join(URL(f"https://a.example/p{i}") for i in range(60000)) + "</urlset>",
    "BOUNDED_SUCCESS", "60k urls capped at 50000 per spec with flag", flags=["url_cap"])
add(21, "nested-index", HDR + IDX + "<sitemap><loc>https://a.example/i2.xml</loc><sitemapindex/></sitemap>" + "</sitemapindex>",
    "BOUNDED_SUCCESS", "nested sitemapindex element ignored with flag", flags=["nested_index_ignored"])
add(22, "index-in-urlset", HDR + NS + "<sitemap><loc>https://a.example/s.xml</loc></sitemap>" + "</urlset>",
    "BOUNDED_SUCCESS", "sitemap entry inside urlset ignored with flag", flags=["misplaced_entry"])
add(23, "url-in-index", HDR + IDX + URL("https://a.example/") + "</sitemapindex>",
    "BOUNDED_SUCCESS", "url entry inside sitemapindex ignored with flag", flags=["misplaced_entry"])
add(24, "wrong-namespace", HDR + '<urlset xmlns="http://example.com/wrong">' + URL("https://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "wrong namespace: entries still extracted with flag, not silently dropped", flags=["namespace_mismatch"])
add(25, "no-namespace", HDR + "<urlset>" + URL("https://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "missing namespace: parsed leniently with flag", flags=["namespace_missing"])
add(26, "image-extension", HDR + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    "<url><loc>https://a.example/</loc><image:image><image:loc>https://a.example/i.jpg</image:loc></image:image></url></urlset>",
    "BOUNDED_SUCCESS", "image extension loc recorded as untrusted ref", flags=["untrusted_ref"])
add(27, "image-loc-relative", HDR + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    "<url><loc>https://a.example/</loc><image:image><image:loc>/i.jpg</image:loc></image:image></url></urlset>",
    "BOUNDED_SUCCESS", "relative image loc: unresolved_ref", flags=["unresolved_ref"])
add(28, "video-extension", HDR + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">' +
    "<url><loc>https://a.example/</loc><video:video><video:content_loc>https://a.example/v.mp4</video:content_loc></video:video></url></urlset>",
    "BOUNDED_SUCCESS", "video extension verbatim")
add(29, "news-extension", HDR + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' +
    "<url><loc>https://a.example/</loc><news:news><news:publication_date>not-a-date</news:publication_date></news:news></url></urlset>",
    "BOUNDED_SUCCESS", "news publication_date verbatim with flag", flags=["format_suspect"])
add(30, "xhtml-alternate", HDR + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    '<url><loc>https://a.example/</loc><xhtml:link rel="alternate" hreflang="es" href="https://a.example/es"/></url></urlset>',
    "BOUNDED_SUCCESS", "xhtml alternates recorded as untrusted refs", flags=["untrusted_ref"])
add(31, "loc-xss", HDR + NS + URL('https://a.example/"&gt;&lt;script&gt;alert(1)&lt;/script&gt;') + "</urlset>",
    "BOUNDED_SUCCESS", "markup inside loc stays inert string data", flags=["markup_in_loc"])
add(32, "loc-bidi", HDR + NS + URL("https://\u202ea.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "bidi in loc neutralized in normalized view, verbatim preserved", flags=["bidi_neutralized"])
add(33, "loc-credentials", HDR + NS + URL("https://user:pass@a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "credential-bearing loc: rejected entry, no secret in record", flags=["credential_url_rejected"])
add(34, "loc-localhost", HDR + NS + URL("http://localhost/admin") + "</urlset>",
    "BOUNDED_SUCCESS", "localhost loc flagged (SSRF-adjacent), kept as claimed", flags=["ssrf_suspect"])
add(35, "loc-169254", HDR + NS + URL("http://169.254.169.254/meta") + "</urlset>",
    "BOUNDED_SUCCESS", "link-local loc flagged ssrf_suspect", flags=["ssrf_suspect"])
add(36, "dup-locs", HDR + NS + URL("https://a.example/dup") + URL("https://a.example/dup") + "</urlset>",
    "BOUNDED_SUCCESS", "duplicate locs both recorded with flag, no silent dedup", flags=["duplicate_loc"])
add(37, "loc-case-dup", HDR + NS + URL("https://a.example/About") + URL("https://a.example/about") + "</urlset>",
    "BOUNDED_SUCCESS", "case-variant locs kept as distinct (no case-fold guess)")
add(38, "trailing-slash-dup", HDR + NS + URL("https://a.example/about") + URL("https://a.example/about/") + "</urlset>",
    "BOUNDED_SUCCESS", "trailing-slash variants kept distinct, no normalization guess")
add(39, "query-frag", HDR + NS + URL("https://a.example/?a=1&amp;b=2#frag") + "</urlset>",
    "BOUNDED_SUCCESS", "query+fragment preserved verbatim")
add(40, "huge-loc-10k", HDR + NS + URL("https://a.example/" + "p"*10000) + "</urlset>",
    "BOUNDED_SUCCESS", "10KB loc kept with length note (no per-loc cap in spec; recorded)")
add(41, "control-chars", HDR + NS + "<url><loc>https://a.example/\x01\x02</loc></url>" + "</urlset>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "control chars in XML: not well-formed, quarantined", flags=["quarantined"])
add(42, "bom-present", "﻿" + HDR + NS + URL("https://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "BOM tolerated, stripped with encoding note")
add(43, "encoding-lie", '<?xml version="1.0" encoding="ISO-8859-1"?>' + NS + URL("https://a.example/caf\u00e9") + "</urlset>",
    "BOUNDED_SUCCESS", "declared encoding vs content flagged, not re-decoded by guess", flags=["encoding_suspect"])
add(44, "comment-loc", HDR + NS + "<!-- https://a.example/hidden -->" + URL("https://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "commented loc never becomes a URL claim", verbatim=["https://a.example/"])
add(45, "pi-loc", HDR + NS + "<?php echo 'https://a.example/pi'; ?>" + URL("https://a.example/") + "</urlset>",
    "BOUNDED_SUCCESS", "processing instruction ignored")
add(46, "cdata-loc", HDR + NS + "<url><loc><![CDATA[https://a.example/cdata]]></loc></url>" + "</urlset>",
    "BOUNDED_SUCCESS", "CDATA loc extracted as text")
add(47, "entity-defined-benign", HDR + '<!DOCTYPE urlset [<!ENTITY brand "Acme">]>' + NS + URL("https://a.example/&brand;") + "</urlset>",
    "TYPED_FAILURE:INVALID_PAYLOAD", "even benign entities rejected: no DTD at all", flags=["entity_rejected"])
add(48, "sitemap-lastmod", HDR + IDX + "<sitemap><loc>https://a.example/s1.xml</loc><lastmod>2026-13-45</lastmod></sitemap>" + "</sitemapindex>",
    "BOUNDED_SUCCESS", "invalid sitemap lastmod verbatim with flag", flags=["format_suspect"])
add(49, "mixed-content", HDR + NS + URL("https://a.example/") + "<foo>bar</foo>" + "</urlset>",
    "BOUNDED_SUCCESS", "unknown elements ignored with flag, known urls kept", flags=["unknown_element"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.xml"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["xml"])
    manifest.append({k: v for k, v in c.items() if k != "xml"})
with open(os.path.join(WORK, "manifest-0551-0600.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
