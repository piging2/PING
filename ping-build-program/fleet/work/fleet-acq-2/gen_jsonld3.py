#!/usr/bin/env python3
"""fleet-acq-2: json-ld batch 3 (missions ACQ-0351..ACQ-0400, json-ld cases 100-149).
Null/empty edges, scalar-form variety, duplicate keys, nested graphs, date-ish strings."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsonld")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, doc_raw, expect, note, flags=(), verbatim=()):
    CASES.append({"case": case, "mission_no": 351 + (case - 100), "slug": slug, "bound": "JSONLD",
                  "doc_raw": doc_raw, "is_raw": isinstance(doc_raw, str),
                  "expect": expect, "note": note, "expect_flags": list(flags),
                  "verbatim": list(verbatim)})

add(100, "graph-empty", {"@graph": []}, "BOUNDED_SUCCESS", "empty @graph -> legitimate empty", flags=["empty_block"])
add(101, "graph-nondict-member", {"@graph": [{"@type": "Thing", "name": "A"}, "stray", 42]}, "BOUNDED_SUCCESS",
    "non-dict @graph members skipped with flag, dict member kept", flags=["graph_nondict_skipped"])
add(102, "graph-nested", {"@graph": [{"@type": "Thing", "@graph": [{"@type": "Thing", "name": "inner"}]}]}, "BOUNDED_SUCCESS",
    "nested @graph: recorded with nested_graph_unexpanded flag; no infinite recursion", flags=["nested_graph_unexpanded"])
add(103, "duplicate-keys", '{"@type": "LocalBusiness", "name": "First", "name": "Second"}', "BOUNDED_SUCCESS",
    "duplicate keys: last-wins per JSON, flagged duplicate_key; raw preserved in quarantine ref", flags=["duplicate_key"], verbatim=['"name": "First"', '"name": "Second"'])
add(104, "number-forms", '{"@type": "Product", "a": 1e3, "b": -0.0, "c": 0.1}', "BOUNDED_SUCCESS",
    "number forms verbatim", verbatim=["1e3"])
add(105, "unicode-escapes", {"@type": "LocalBusiness", "name": "Acm\\u0045 Ltd"}, "BOUNDED_SUCCESS",
    "unicode escapes decoded by parser, flagged; raw escape preserved in evidence", flags=["unicode_escape"])
add(106, "long-type-10k", {"@type": "X" * 10000}, "BOUNDED_SUCCESS",
    "10KB @type kept verbatim with long_type flag", flags=["long_type"])
add(107, "empty-type", {"@type": "", "name": "X"}, "BOUNDED_SUCCESS",
    "empty @type flagged, treated as unknown", flags=["empty_type"])
add(108, "empty-id", {"@id": "", "@type": "Thing"}, "BOUNDED_SUCCESS",
    "empty @id flagged, not an identity", flags=["empty_id"])
add(109, "name-null", {"@type": "LocalBusiness", "name": None}, "BOUNDED_SUCCESS",
    "null name recorded as null with flag, not dropped silently", flags=["null_name"])
add(110, "telephone-null", {"@type": "LocalBusiness", "telephone": None}, "BOUNDED_SUCCESS",
    "null telephone verbatim")
add(111, "address-null", {"@type": "LocalBusiness", "address": None}, "BOUNDED_SUCCESS",
    "null address verbatim")
add(112, "name-boolean", {"@type": "LocalBusiness", "name": True}, "BOUNDED_SUCCESS",
    "boolean name verbatim with type_mismatch flag", flags=["type_mismatch_verbatim"])
add(113, "geo-array", {"@type": "LocalBusiness", "geo": [39.0, -108.0]}, "BOUNDED_SUCCESS",
    "array geo verbatim; never interpreted as lat/long pair", flags=["geo_unparsed"])
add(114, "geo-string", {"@type": "LocalBusiness", "geo": "39.0,-108.0"}, "BOUNDED_SUCCESS",
    "string geo verbatim; never split into coordinates", flags=["geo_unparsed"], verbatim=["39.0,-108.0"])
add(115, "ohs-array-2", {"@type": "LocalBusiness", "openingHoursSpecification": [
    {"dayOfWeek": "Monday", "opens": "09:00"}, {"dayOfWeek": "Tuesday", "opens": "09:00"}]}, "BOUNDED_SUCCESS",
    "two specs kept")
add(116, "dayofweek-url", {"@type": "LocalBusiness", "openingHoursSpecification": {"dayOfWeek": "https://schema.org/Monday"}}, "BOUNDED_SUCCESS",
    "URL-form dayOfWeek verbatim")
add(117, "opens-9am", {"@type": "LocalBusiness", "openingHoursSpecification": {"dayOfWeek": "Monday", "opens": "9am"}}, "BOUNDED_SUCCESS",
    "non-ISO opens verbatim with format_suspect flag", flags=["format_suspect"])
add(118, "pricespec-nocurrency", {"@type": "Product", "offers": {"@type": "Offer", "priceSpecification": {"@type": "PriceSpecification", "price": 5}}}, "BOUNDED_SUCCESS",
    "priceSpecification without currency: verbatim, no default currency assumed")
add(119, "minprice-gt-maxprice", {"@type": "AggregateOffer", "lowPrice": 100, "highPrice": 10}, "BOUNDED_SUCCESS",
    "lowPrice > highPrice flagged inconsistent, verbatim", flags=["inconsistent_range"])
add(120, "eligible-qty-zero", {"@type": "Offer", "eligibleQuantity": 0}, "BOUNDED_SUCCESS",
    "zero quantity verbatim (distinct from missing)")
add(121, "review-author-string", {"@type": "Review", "author": "Jo"}, "BOUNDED_SUCCESS",
    "string author verbatim; no Person synthesis")
add(122, "rating-number", {"@type": "Review", "reviewRating": 5}, "BOUNDED_SUCCESS",
    "numeric reviewRating verbatim; no Rating object synthesis")
add(123, "worst-gt-best", {"@type": "AggregateRating", "worstRating": 5, "bestRating": 1, "ratingValue": 3}, "BOUNDED_SUCCESS",
    "worstRating > bestRating flagged inconsistent", flags=["inconsistent_rating"])
add(124, "sameas-empty", {"@type": "LocalBusiness", "sameAs": []}, "BOUNDED_SUCCESS",
    "empty sameAs -> legitimate empty")
add(125, "sameas-dupes", {"@type": "LocalBusiness", "sameAs": ["https://a.example/", "https://a.example/"]}, "BOUNDED_SUCCESS",
    "duplicate sameAs URLs flagged, both recorded", flags=["duplicate_refs"])
add(126, "url-array", {"@type": "LocalBusiness", "url": ["https://a.example/", "https://b.example/"]}, "BOUNDED_SUCCESS",
    "two urls kept, no canonical pick", flags=["multi_url"])
add(127, "image-array-3", {"@type": "LocalBusiness", "image": ["https://s.example/1.jpg", "https://s.example/2.jpg", "https://s.example/3.jpg"]}, "BOUNDED_SUCCESS",
    "3 images kept", flags=["multi_image"])
add(128, "video-object", {"@type": "LocalBusiness", "video": {"@type": "VideoObject", "contentUrl": "https://s.example/v.mp4"}}, "BOUNDED_SUCCESS",
    "video object verbatim; contentUrl untrusted ref")
add(129, "subjectof-array", {"@type": "Article", "subjectOf": [{"@type": "WebPage"}, {"@type": "VideoObject"}]}, "BOUNDED_SUCCESS",
    "subjectOf array verbatim")
add(130, "about-string", {"@type": "Article", "about": "plumbing"}, "BOUNDED_SUCCESS",
    "string about verbatim")
add(131, "keywords-forms", {"@type": "Article", "keywords": "a, b"}, "BOUNDED_SUCCESS",
    "keywords string verbatim; never split into array")
add(132, "inlanguage", {"@type": "Article", "inLanguage": "en-US"}, "BOUNDED_SUCCESS",
    "inLanguage verbatim")
add(133, "datepublished-words", {"@type": "Article", "datePublished": "yesterday"}, "BOUNDED_SUCCESS",
    "datePublished 'yesterday' verbatim; never parsed to date", flags=["format_suspect"], verbatim=["yesterday"])
add(134, "datemodified-future", {"@type": "Article", "dateModified": "2027-05-01"}, "BOUNDED_SUCCESS",
    "dateModified verbatim; no temporal reasoning")
add(135, "expires-never", {"@type": "Offer", "expires": "never"}, "BOUNDED_SUCCESS",
    "expires 'never' verbatim", verbatim=["never"])
add(136, "workstatus-draft", {"@type": "Article", "creativeWorkStatus": "Draft"}, "BOUNDED_SUCCESS",
    "creativeWorkStatus verbatim")
add(137, "audience-object", {"@type": "Product", "audience": {"@type": "Audience", "audienceType": "homeowners"}}, "BOUNDED_SUCCESS",
    "audience verbatim")
add(138, "provider-noname", {"@type": "Service", "provider": {"@type": "Organization"}}, "BOUNDED_SUCCESS",
    "nameless provider flagged incomplete, verbatim", flags=["incomplete_org"])
add(139, "brand-noname", {"@type": "Product", "brand": {"@type": "Brand"}}, "BOUNDED_SUCCESS",
    "nameless brand verbatim")
add(140, "manufacturer-string", {"@type": "Product", "manufacturer": "Acme Corp"}, "BOUNDED_SUCCESS",
    "manufacturer string verbatim")
add(141, "model-string", {"@type": "Product", "model": "X-100"}, "BOUNDED_SUCCESS",
    "model verbatim")
add(142, "sku-spaces", {"@type": "Product", "sku": "  SKU 42  "}, "BOUNDED_SUCCESS",
    "sku whitespace preserved verbatim", flags=["whitespace_value"])
add(143, "gtin-nondigit", {"@type": "Product", "gtin": "not-a-gtin"}, "BOUNDED_SUCCESS",
    "non-digit gtin verbatim with format_suspect", flags=["format_suspect"])
add(144, "mpn-null", {"@type": "Product", "mpn": None}, "BOUNDED_SUCCESS",
    "null mpn verbatim")
add(145, "lowprice-string", {"@type": "AggregateOffer", "lowPrice": "5"}, "BOUNDED_SUCCESS",
    "lowPrice string verbatim", flags=["type_mismatch_verbatim"])
add(146, "offercount-words", {"@type": "AggregateOffer", "offerCount": "many"}, "BOUNDED_SUCCESS",
    "offerCount 'many' verbatim", flags=["type_mismatch_verbatim"])
add(147, "businessfunction-url", {"@type": "Offer", "businessFunction": "https://schema.org/Sell"}, "BOUNDED_SUCCESS",
    "businessFunction URL verbatim")
add(148, "leadtime-string", {"@type": "Offer", "deliveryLeadTime": "2 days"}, "BOUNDED_SUCCESS",
    "deliveryLeadTime string verbatim; never converted to duration")
add(149, "dept-blanknode-employees", {"@type": "LocalBusiness", "department": [
    {"@type": "LocalBusiness", "name": "D", "employee": {"@type": "Person", "name": "Al"}},
    {"@type": "LocalBusiness", "name": "D", "employee": {"@type": "Person", "name": "Al"}}]}, "BOUNDED_SUCCESS",
    "identical blank-node departments NOT merged", flags=["blank_nodes_unmerged"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.json"
    payload = c["doc_raw"] if c["is_raw"] else json.dumps(c["doc_raw"])
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(payload)
    manifest.append({k: v for k, v in c.items() if k not in ("doc_raw", "is_raw")})
with open(os.path.join(WORK, "manifest-0351-0400.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
