#!/usr/bin/env python3
"""fleet-acq-2: structured-metadata batch 2 (missions ACQ-0501..ACQ-0550, cases 100-149).
Vertical OG namespaces, secrets in meta, app links, contact-data conflicts."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, head_inner, expect, note, body="<p>b</p>", checks=None, full=None):
    doc = full if full else f"<!DOCTYPE html><html><head>{head_inner}</head><body>{body}</body></html>"
    CASES.append({"case": case, "mission_no": 501 + (case - 100), "slug": slug, "bound": "META",
                  "html": doc, "expect": expect, "note": note, "checks": checks or {}})

M = lambda n, c: f'<meta name="{n}" content="{c}">'
P = lambda p, c: f'<meta property="{p}" content="{c}">'

add(100, "og-site-name", P("og:site_name", "Acme Inc"), "BOUNDED_SUCCESS", "site_name verbatim",
    checks={"meta_present": {"og:site_name": "Acme Inc"}})
add(101, "sitename-vs-name", P("og:site_name", "Acme Inc") + P("og:title", "Acme Plumbing"),
    "BOUNDED_SUCCESS", "site_name vs title kept separate, no brand merge")
add(102, "article-author-url", P("article:author", "https://a.example/jo"),
    "BOUNDED_SUCCESS", "author URL untrusted ref, never fetched",
    checks={"flags": ["untrusted_ref"]})
add(103, "article-author-name", P("article:author", "Jo Smith"),
    "BOUNDED_SUCCESS", "author name verbatim; no Person synthesis")
add(104, "article-section", P("article:section", "Plumbing Tips"),
    "BOUNDED_SUCCESS", "section verbatim")
add(105, "article-tag-markup", P("article:tag", "<b>bold tag</b>"),
    "BOUNDED_SUCCESS", "markup in tag stays inert",
    checks={"flags": ["markup_in_meta"]})
add(106, "book-isbn-nondigit", P("books:isbn", "not-an-isbn"),
    "BOUNDED_SUCCESS", "non-digit ISBN verbatim with flag",
    checks={"flags": ["format_suspect"]})
add(107, "brand-conflict", P("product:brand", "Acme") + P("og:brand", "AcmeCo"),
    "BOUNDED_SUCCESS", "brand namespaces kept separate")
add(108, "availability-lower", P("product:availability", "instock"),
    "BOUNDED_SUCCESS", "lowercase availability verbatim, never normalized")
add(109, "condition-new", P("product:condition", "new"),
    "BOUNDED_SUCCESS", "condition verbatim")
add(110, "retailer-id", P("product:retailer_item_id", "SKU-42"),
    "BOUNDED_SUCCESS", "retailer id verbatim")
add(111, "price-vs-original", P("product:price:amount", "80") + P("product:original_price:amount", "100"),
    "BOUNDED_SUCCESS", "price vs original kept separate; NO discount math performed",
    checks={"flags": ["no_computed_discount"]})
add(112, "price-currency-meta", P("product:price:amount", "80") + P("product:price:currency", "EUR"),
    "BOUNDED_SUCCESS", "amount+currency pair verbatim")
add(113, "video-actor-array", P("video:actor", "https://a.example/a1") + P("video:actor", "https://a.example/a2"),
    "BOUNDED_SUCCESS", "two actors kept",
    checks={"flags": ["dup_meta", "untrusted_ref"]})
add(114, "video-director", P("video:director", "Jo"),
    "BOUNDED_SUCCESS", "director verbatim")
add(115, "video-duration", P("video:duration", "90"),
    "BOUNDED_SUCCESS", "duration verbatim; no time math",
    checks={"meta_present": {"video:duration": "90"}})
add(116, "video-release-words", P("video:release_date", "last summer"),
    "BOUNDED_SUCCESS", "release date words verbatim with flag",
    checks={"flags": ["format_suspect"]})
add(117, "video-tags-200", "".join(P("video:tag", f"v{i}") for i in range(200)),
    "BOUNDED_SUCCESS", "200 video tags kept with count",
    checks={"flags": ["multi_count=200"]})
add(118, "music-duration", P("music:duration", "245"),
    "BOUNDED_SUCCESS", "music duration verbatim")
add(119, "music-album-disc", P("music:album:disc", "2"),
    "BOUNDED_SUCCESS", "album disc verbatim")
add(120, "music-album-track", P("music:album:track", "7"),
    "BOUNDED_SUCCESS", "album track verbatim")
add(121, "profile-username", P("profile:username", "acmefan"),
    "BOUNDED_SUCCESS", "username verbatim; not a verified identity")
add(122, "profile-gender", P("profile:gender", "other"),
    "BOUNDED_SUCCESS", "gender verbatim")
add(123, "og-restrictions-age", P("og:restrictions:age", "18+"),
    "BOUNDED_SUCCESS", "age restriction verbatim")
add(124, "og-restrictions-country", P("og:restrictions:country:allowed", "US"),
    "BOUNDED_SUCCESS", "country restriction verbatim")
add(125, "twitter-card", M("twitter:card", "summary_large_image"),
    "BOUNDED_SUCCESS", "card type verbatim")
add(126, "twitter-site", M("twitter:site", "@acme"),
    "BOUNDED_SUCCESS", "twitter handle verbatim; not a verified identity",
    checks={"flags": ["claimed_not_verified"]})
add(127, "twitter-site-vs-creator", M("twitter:site", "@acme") + M("twitter:creator", "@jo"),
    "BOUNDED_SUCCESS", "site vs creator kept separate")
add(128, "twitter-desc-markup", M("twitter:description", "<i>hi</i>"),
    "BOUNDED_SUCCESS", "markup in twitter description inert",
    checks={"flags": ["markup_in_meta"]})
add(129, "twitter-app-iphone", M("twitter:app:name:iphone", "Acme App"),
    "BOUNDED_SUCCESS", "app name verbatim")
add(130, "twitter-app-url-custom", M("twitter:app:url:iphone", "acmeapp://open?x=1"),
    "BOUNDED_SUCCESS", "custom-scheme app URL recorded, never followed",
    checks={"flags": ["custom_scheme"]})
add(131, "keywords-200", M("keywords", ",".join(f"k{i}" for i in range(200))),
    "BOUNDED_SUCCESS", "200 keywords preserved with count note",
    checks={"flags": ["keywords_count=200"]})
add(132, "news-keywords", M("news_keywords", "plumbing, emergency"),
    "BOUNDED_SUCCESS", "news_keywords verbatim")
add(133, "author-vs-article-author", M("author", "Jo") + P("article:author", "Jo Smith"),
    "BOUNDED_SUCCESS", "author variants kept separate")
add(134, "desc-triple", M("description", "D1") + P("og:description", "D2") + M("twitter:description", "D3"),
    "BOUNDED_SUCCESS", "three descriptions separate, no merge",
    checks={"meta_present": {"description": "D1", "og:description": "D2", "twitter:description": "D3"}})
add(135, "robots-maxpreview", M("robots", "max-image-preview:large"),
    "BOUNDED_SUCCESS", "robots directive verbatim")
add(136, "googlebot-noindex", M("googlebot", "noindex"),
    "BOUNDED_SUCCESS", "per-agent noindex recorded as policy signal",
    checks={"flags": ["policy_noindex"]})
add(137, "google-verification", M("google-site-verification", "dEaDbEeF1234567890"),
    "BOUNDED_SUCCESS", "verification token REDACTED (secret-shaped), never a fact",
    checks={"flags": ["secret_shaped_redacted"]})
add(138, "fb-verification", M("facebook-domain-verification", "fb12345secret"),
    "BOUNDED_SUCCESS", "fb verification token redacted",
    checks={"flags": ["secret_shaped_redacted"]})
add(139, "csrf-token", M("csrf-token", "tok_abc123"),
    "BOUNDED_SUCCESS", "csrf token redacted, never extracted as content",
    checks={"flags": ["secret_shaped_redacted"]})
add(140, "api-key-meta", M("api-key", "sk-live-999"),
    "BOUNDED_SUCCESS", "api key redacted",
    checks={"flags": ["secret_shaped_redacted"]})
add(141, "og-image-alt-phone", P("og:image", "https://a.example/i.jpg") + P("og:image:alt", "Call (555) 222-0000"),
    "BOUNDED_SUCCESS", "image alt extracted with alt provenance; phone alt-sourced only")
add(142, "twitter-image-alt", M("twitter:image", "https://a.example/i.jpg") + M("twitter:image:alt", "Shop front"),
    "BOUNDED_SUCCESS", "twitter image alt kept")
add(143, "og-desc-phone", P("og:description", "Call (555) 333-0000 today"),
    "BOUNDED_SUCCESS", "phone in og:description recorded as meta-sourced observation, never canonical")
add(144, "contact-data-ns", P("business:contact_data:street_address", "123 Main") + P("business:contact_data:locality", "GJ"),
    "BOUNDED_SUCCESS", "contact_data namespace verbatim")
add(145, "contact-phone-conflict", P("business:contact_data:phone_number", "(555) 000-1111"),
    "BOUNDED_SUCCESS", "contact_data phone kept separate from page phone; no canonical pick",
    checks={"meta_present": {"business:contact_data:phone_number": "(555) 000-1111"}})
add(146, "place-lat-na", P("place:location:latitude", "N/A"),
    "BOUNDED_SUCCESS", "N/A latitude: geo_unparsed + format_suspect, verbatim",
    checks={"flags": ["geo_unparsed", "format_suspect"]})
add(147, "geo-region", M("geo.region", "US-CO"),
    "BOUNDED_SUCCESS", "geo.region verbatim")
add(148, "x-ua-compatible", '<meta http-equiv="X-UA-Compatible" content="IE=edge">',
    "BOUNDED_SUCCESS", "http-equiv verbatim")
add(149, "format-detection", M("format-detection", "telephone=no"),
    "BOUNDED_SUCCESS", "format-detection recorded as policy signal",
    checks={"flags": ["policy_signal"]})

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k != "html"})
with open(os.path.join(WORK, "manifest-0501-0550.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
