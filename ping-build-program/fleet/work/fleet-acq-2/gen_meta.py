#!/usr/bin/env python3
"""fleet-acq-2: structured-metadata fixtures (missions ACQ-0451..ACQ-0500, cases 50-99).
OG/Twitter/Dublin-Core/meta/link/base/head-edge hardening."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, head_inner, expect, note, body="<p>b</p>", checks=None, full=None):
    doc = full if full else f"<!DOCTYPE html><html><head>{head_inner}</head><body>{body}</body></html>"
    CASES.append({"case": case, "mission_no": 451 + (case - 50), "slug": slug, "bound": "META",
                  "html": doc, "expect": expect, "note": note, "checks": checks or {}})

M = lambda n, c: f'<meta name="{n}" content="{c}">'
P = lambda p, c: f'<meta property="{p}" content="{c}">'

add(50, "og-basic", P("og:title", "Acme") + P("og:type", "website") + P("og:url", "https://acme.example/"),
    "BOUNDED_SUCCESS", "basic OG tags recorded as claimed metadata",
    checks={"meta_present": {"og:title": "Acme", "og:type": "website"}})
add(51, "og-title-vs-title", "<title>HTML Title</title>" + P("og:title", "OG Title"),
    "BOUNDED_SUCCESS", "og:title vs <title> kept separate, no merge",
    checks={"flags": ["title_conflict"], "meta_present": {"og:title": "OG Title"}})
add(52, "triple-title-conflict", "<title>T1</title>" + P("og:title", "T2") + M("twitter:title", "T3"),
    "BOUNDED_SUCCESS", "three title variants: separate provenance each",
    checks={"flags": ["title_conflict"]})
add(53, "og-image-absolute", P("og:image", "https://acme.example/i.jpg") + P("og:image:width", "1200"),
    "BOUNDED_SUCCESS", "absolute og:image recorded as untrusted ref, never fetched",
    checks={"flags": ["untrusted_ref"], "meta_present": {"og:image": "https://acme.example/i.jpg"}})
add(54, "og-image-relative", P("og:image", "/i.jpg"),
    "BOUNDED_SUCCESS", "relative og:image -> unresolved_ref",
    checks={"flags": ["unresolved_ref"]})
add(55, "og-image-javascript", P("og:image", "javascript:evil()"),
    "BOUNDED_SUCCESS", "javascript: og:image dropped per scheme allowlist",
    checks={"flags": ["scheme_dropped"], "meta_absent": ["og:image"]})
add(56, "og-image-data", P("og:image", "data:image/png;base64,AAA"),
    "BOUNDED_SUCCESS", "data: og:image dropped (no inline payload promotion)",
    checks={"flags": ["scheme_dropped"], "meta_absent": ["og:image"]})
add(57, "og-image-multi", P("og:image", "https://a.example/1.jpg") + P("og:image", "https://a.example/2.jpg"),
    "BOUNDED_SUCCESS", "two og:images both kept with dup flag",
    checks={"flags": ["dup_meta"]})
add(58, "og-image-width-nonnumeric", P("og:image", "https://a.example/i.jpg") + P("og:image:width", "wide"),
    "BOUNDED_SUCCESS", "non-numeric width verbatim with flag",
    checks={"flags": ["format_suspect"]})
add(59, "og-locale-vs-htmllang", '<html lang="en">', "BOUNDED_SUCCESS", "og:locale vs html lang kept separate",
    full='<!DOCTYPE html><html lang="en"><head>' + P("og:locale", "es_ES") + '</head><body><p>b</p></body></html>',
    checks={"flags": ["locale_conflict"]})
add(60, "og-desc-markup", P("og:description", "<b>bold</b> & <script>x</script>"),
    "BOUNDED_SUCCESS", "markup inside og:description stays inert string",
    checks={"flags": ["markup_in_meta"]})
add(61, "dc-title", M("dc.title", "DC Title") + M("DC.creator", "Jo"),
    "BOUNDED_SUCCESS", "Dublin Core recorded verbatim",
    checks={"meta_present": {"dc.title": "DC Title"}})
add(62, "meta-refresh-js", '<meta http-equiv="refresh" content="0;url=javascript:evil()">',
    "BOUNDED_SUCCESS", "javascript: refresh target dropped, refresh recorded not followed",
    checks={"flags": ["hostile_refresh_dropped", "meta_refresh_recorded_not_followed"]})
add(63, "meta-robots-noindex", M("robots", "noindex, nofollow"),
    "BOUNDED_SUCCESS", "robots noindex recorded as policy signal, not a content fact",
    checks={"flags": ["policy_noindex"]})
add(64, "canonical-signal", '<link rel="canonical" href="https://a.example/c">',
    "BOUNDED_SUCCESS", "canonical recorded as signal, never as authority",
    checks={"flags": ["canonical_signal_not_authority"]})
add(65, "charset-conflict", '<meta charset="utf-8"><meta http-equiv="content-type" content="text/html; charset=iso-8859-1">',
    "BOUNDED_SUCCESS", "conflicting charset declarations kept separate with flag",
    checks={"flags": ["charset_conflict"]})
add(66, "theme-color-bad", M("theme-color", "notacolor"),
    "BOUNDED_SUCCESS", "invalid theme-color verbatim with flag",
    checks={"flags": ["format_suspect"]})
add(67, "viewport-weird", M("viewport", "width=99999, initial-scale=abc"),
    "BOUNDED_SUCCESS", "viewport verbatim, never interpreted",
    checks={"meta_present": {"viewport": "width=99999, initial-scale=abc"}})
add(68, "generator-claim", M("generator", "WordPress 99.99 (fake)"),
    "BOUNDED_SUCCESS", "generator recorded as CLAIMED, never trusted as fact",
    checks={"flags": ["claimed_not_verified"]})
add(69, "geo-position", M("geo.position", "39.1;-108.5") + M("ICBM", "39.1, -108.5"),
    "BOUNDED_SUCCESS", "geo.position/ICBM verbatim; never parsed to coordinates",
    checks={"flags": ["geo_unparsed"]})
add(70, "revisit-after", M("revisit-after", "never"),
    "BOUNDED_SUCCESS", "revisit-after verbatim")
add(71, "rating-meta", M("rating", "adult"),
    "BOUNDED_SUCCESS", "rating meta verbatim")
add(72, "product-price-free", P("product:price:amount", "free") + P("product:price:currency", "USD"),
    "BOUNDED_SUCCESS", "price 'free' verbatim, never coerced to 0",
    checks={"meta_present": {"product:price:amount": "free"}})
add(73, "og-type-mismatch", P("og:type", "video.movie") + P("og:title", "Our Shop"),
    "BOUNDED_SUCCESS", "og:type verbatim even if mismatched to business page")
add(74, "empty-content", M("description", ""),
    "BOUNDED_SUCCESS", "empty content recorded as empty, not dropped silently",
    checks={"meta_present": {"description": ""}})
add(75, "whitespace-content", M("description", "   "),
    "BOUNDED_SUCCESS", "whitespace-only content flagged",
    checks={"flags": ["whitespace_value"]})
add(76, "case-variant-keys", P("OG:TITLE", "Upper") + P("og:title", "Lower"),
    "BOUNDED_SUCCESS", "case variants matched case-insensitively, original case recorded, dup flagged",
    checks={"flags": ["dup_meta"]})
add(77, "property-vs-name", P("og:title", "ViaProperty") + M("og:title", "ViaName"),
    "BOUNDED_SUCCESS", "property/name variants both recorded with variant flag",
    checks={"flags": ["attr_variant"]})
add(78, "anonymous-meta", '<meta content="orphan value">',
    "BOUNDED_SUCCESS", "meta with no name/property recorded as anonymous, not dropped",
    checks={"flags": ["anonymous_meta"]})
add(79, "two-titles", "<title>First</title><title>Second</title>",
    "BOUNDED_SUCCESS", "two <title>: first wins per spec, dup flagged",
    checks={"flags": ["dup_title"]})
add(80, "title-empty", "<title></title>",
    "BOUNDED_SUCCESS", "empty title -> legitimate empty, not a failure")
add(81, "desc-5k", M("description", "d" * 5000),
    "BOUNDED_SUCCESS", "5KB description truncated at value cap with flag",
    checks={"flags": ["value_truncated"]})
add(82, "meta-bomb-600", "".join(M(f"k{i}", "v") for i in range(600)),
    "BOUNDED_SUCCESS", "600 metas capped at 500 with flag",
    checks={"flags": ["truncated_meta"]})
add(83, "article-tags-300", "".join(P("article:tag", f"t{i}") for i in range(300)),
    "BOUNDED_SUCCESS", "300 article:tags kept with count note (multi-values preserved)",
    checks={"flags": ["multi_count=300"]})
add(84, "article-time-words", P("article:published_time", "yesterday"),
    "BOUNDED_SUCCESS", "published_time verbatim, never parsed to datetime",
    checks={"flags": ["format_suspect"]})
add(85, "og-seealso-js", P("og:see_also", "javascript:evil()"),
    "BOUNDED_SUCCESS", "javascript: see_also dropped",
    checks={"flags": ["scheme_dropped"], "meta_absent": ["og:see_also"]})
add(86, "twitter-image-http", M("twitter:image", "http://a.example/i.jpg"),
    "BOUNDED_SUCCESS", "http (non-https) image URL verbatim with insecure-scheme flag",
    checks={"flags": ["insecure_scheme"]})
add(87, "fb-app-id", P("fb:app_id", "12345"),
    "BOUNDED_SUCCESS", "fb:app_id verbatim")
add(88, "al-ios-deeplink", P("al:ios:url", "myapp://open?x=1"),
    "BOUNDED_SUCCESS", "app deep link recorded as untrusted ref, never followed",
    checks={"flags": ["untrusted_ref"]})
add(89, "book-author-array", P("book:author", "https://a.example/a1") + P("book:author", "https://a.example/a2"),
    "BOUNDED_SUCCESS", "two book:authors kept",
    checks={"flags": ["dup_meta"]})
add(90, "profile-name-vs-og", P("profile:first_name", "Al") + P("og:title", "Al's Shop"),
    "BOUNDED_SUCCESS", "profile name vs og:title kept separate")
add(91, "og-determiner", P("og:determiner", "the"),
    "BOUNDED_SUCCESS", "determiner verbatim")
add(92, "icon-data-url", '<link rel="icon" href="data:image/x-icon;base64,AAA">',
    "BOUNDED_SUCCESS", "data: icon href dropped per scheme policy",
    checks={"flags": ["scheme_dropped"]})
add(93, "alternate-hreflang", '<link rel="alternate" hreflang="es" href="https://a.example/es">',
    "BOUNDED_SUCCESS", "hreflang alternate recorded as untrusted ref",
    checks={"flags": ["untrusted_ref"]})
add(94, "base-href", '<base href="http://evil.example/">',
    "BOUNDED_SUCCESS", "base href recorded as untrusted",
    checks={"flags": ["base_href_recorded_untrusted"]})
add(95, "og-audio-spotify", P("og:audio", "https://open.spotify.example/x"),
    "BOUNDED_SUCCESS", "og:audio URL recorded untrusted, never fetched",
    checks={"flags": ["untrusted_ref"]})
add(96, "og-video-insecure", P("og:video", "http://a.example/v.mp4") + P("og:video:secure_url", "https://a.example/v.mp4"),
    "BOUNDED_SUCCESS", "video + secure_url both recorded verbatim",
    checks={"flags": ["insecure_scheme"]})
add(97, "music-namespace", P("music:musician", "https://a.example/m"),
    "BOUNDED_SUCCESS", "music namespace verbatim")
add(98, "place-location", P("place:location:latitude", "39.1") + P("place:location:longitude", "-108.5"),
    "BOUNDED_SUCCESS", "place coordinates verbatim strings, never parsed to floats",
    checks={"flags": ["geo_unparsed"]})
add(99, "all-conflicts-together",
    "<title>HT</title>" + P("og:title", "OG") + M("twitter:title", "TW") + M("dc.title", "DC"),
    "BOUNDED_SUCCESS", "four title variants: all separate, conflict flagged, no canonical pick",
    checks={"flags": ["title_conflict"], "meta_present": {"og:title": "OG", "twitter:title": "TW", "dc.title": "DC"}})

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.html"
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(c["html"])
    manifest.append({k: v for k, v in c.items() if k != "html"})
with open(os.path.join(WORK, "manifest-0451-0500.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
