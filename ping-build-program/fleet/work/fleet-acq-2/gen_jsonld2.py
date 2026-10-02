#!/usr/bin/env python3
"""fleet-acq-2: json-ld batch 2 (missions ACQ-0301..ACQ-0350, json-ld cases 50-99).
Value-form variety, org graph edges, offer/pricing verbatim, whitespace and dup edges."""
import json, os

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsonld")
os.makedirs(FX, exist_ok=True)
CASES = []

def add(case, slug, doc_raw, expect, note, flags=(), verbatim=()):
    CASES.append({"case": case, "mission_no": 301 + (case - 50), "slug": slug, "bound": "JSONLD",
                  "doc_raw": doc_raw, "is_raw": isinstance(doc_raw, str),
                  "expect": expect, "note": note, "expect_flags": list(flags),
                  "verbatim": list(verbatim)})

add(50, "type-as-url", {"@type": "https://schema.org/LocalBusiness", "name": "X"}, "BOUNDED_SUCCESS",
    "URL-form @type recorded verbatim, not normalized to short form", flags=["type_url_form"])
add(51, "name-array", {"@type": "LocalBusiness", "name": ["Acme", "Acme Plumbing Co"]}, "BOUNDED_SUCCESS",
    "name array: both kept, no canonical pick", flags=["multi_name"])
add(52, "name-langmap", {"@type": "LocalBusiness", "name": {"@language": "es", "@value": "Fontanería Acme"}}, "BOUNDED_SUCCESS",
    "language map verbatim; no language-default guess", flags=["lang_map"])
add(53, "description-array", {"@type": "LocalBusiness", "description": ["Best.", "Cheapest."]}, "BOUNDED_SUCCESS",
    "description array verbatim")
add(54, "telephone-array-3", {"@type": "LocalBusiness", "telephone": ["(555) 111-1111", "(555) 222-2222", "(555) 333-3333"]}, "BOUNDED_SUCCESS",
    "3 phones all kept as separate observations", flags=["multi_phone"])
add(55, "contactpoint-conflict", {"@type": "LocalBusiness", "contactPoint": [
    {"@type": "ContactPoint", "contactType": "sales", "telephone": "(555) 100-0000"},
    {"@type": "ContactPoint", "contactType": "support", "telephone": "(555) 200-0000"}]}, "BOUNDED_SUCCESS",
    "contactPoint phones kept per-contactType, no merge")
add(56, "overnight-hours", {"@type": "LocalBusiness", "openingHoursSpecification":
    {"dayOfWeek": "Friday", "opens": "22:00", "closes": "02:00"}}, "BOUNDED_SUCCESS",
    "overnight hours verbatim; no duration arithmetic performed")
add(57, "special-hours", {"@type": "LocalBusiness", "specialOpeningHoursSpecification":
    {"dayOfWeek": "Monday", "opens": "00:00", "closes": "00:00"}}, "BOUNDED_SUCCESS",
    "special hours verbatim")
add(58, "pricerange-symbols", {"@type": "LocalBusiness", "priceRange": "$$$"}, "BOUNDED_SUCCESS",
    "priceRange symbols verbatim", verbatim=["$$$"])
add(59, "currencies", {"@type": "LocalBusiness", "currenciesAccepted": "USD, EUR"}, "BOUNDED_SUCCESS",
    "currenciesAccepted verbatim")
add(60, "payment-array", {"@type": "LocalBusiness", "paymentAccepted": ["Cash", "Credit Card"]}, "BOUNDED_SUCCESS",
    "paymentAccepted verbatim")
add(61, "areaserved-geocircle", {"@type": "LocalBusiness", "areaServed": {"@type": "GeoCircle", "geoMidpoint": {"latitude": 39.0}}}, "BOUNDED_SUCCESS",
    "GeoCircle areaServed verbatim")
add(62, "areaserved-conflict", {"@type": "LocalBusiness", "areaServed": ["Denver", {"@type": "City", "name": "Boulder"}]}, "BOUNDED_SUCCESS",
    "mixed areaServed kept separate", flags=["multi_area"])
add(63, "slogan-escapes", {"@type": "LocalBusiness", "slogan": 'We\'re "the best" \\ guaranteed'}, "BOUNDED_SUCCESS",
    "escapes preserved verbatim", verbatim=["the best"])
add(64, "legalname-vs-name", {"@type": "LocalBusiness", "name": "Acme", "legalName": "Acme LLC"}, "BOUNDED_SUCCESS",
    "legalName/name differ: separate observations, no merge", flags=["name_conflict"])
add(65, "parent-chain-3", {"@type": "LocalBusiness", "name": "C",
    "parentOrganization": {"@type": "Organization", "name": "B",
    "parentOrganization": {"@type": "Organization", "name": "A"}}}, "BOUNDED_SUCCESS",
    "3-deep org chain verbatim; no ultimate-parent resolution")
add(66, "suborg-backref", {"@id": "https://s.example/#p", "@type": "Organization", "name": "P",
    "subOrganization": {"@id": "https://s.example/#c", "@type": "Organization", "name": "C",
    "parentOrganization": {"@id": "https://s.example/#p"}}}, "BOUNDED_SUCCESS",
    "back-reference recorded; no cycle walk attempted", flags=["back_reference"])
add(67, "employee-2", {"@type": "LocalBusiness", "employee": [
    {"@type": "Person", "name": "Al"}, {"@type": "Person", "name": "Bo"}]}, "BOUNDED_SUCCESS",
    "two employees kept")
add(68, "reviews-5-and-1", {"@type": "LocalBusiness", "review": [
    {"@type": "Review", "reviewRating": {"ratingValue": 5}, "reviewBody": "great"},
    {"@type": "Review", "reviewRating": {"ratingValue": 1}, "reviewBody": "awful"}]}, "BOUNDED_SUCCESS",
    "5-star and 1-star reviews both kept; NEVER averaged into a synthetic rating",
    verbatim=['"ratingValue": 5', '"ratingValue": 1'], flags=["no_computed_aggregate"])
add(69, "reviewcount-string", {"@type": "LocalBusiness", "aggregateRating":
    {"@type": "AggregateRating", "ratingValue": 4.5, "reviewCount": "100+"}}, "BOUNDED_SUCCESS",
    "reviewCount '100+' verbatim, never parsed to int", verbatim=["100+"])
add(70, "imageobject-width-str", {"@type": "LocalBusiness", "image":
    {"@type": "ImageObject", "url": "https://s.example/i.jpg", "width": "800px"}}, "BOUNDED_SUCCESS",
    "width string verbatim")
add(71, "logo-relative", {"@type": "LocalBusiness", "logo": "/logo.png"}, "BOUNDED_SUCCESS",
    "relative logo -> unresolved_ref", flags=["unresolved_ref"])
add(72, "sameas-upper-scheme", {"@type": "LocalBusiness", "sameAs": ["HTTPS://ok.example/"]}, "BOUNDED_SUCCESS",
    "uppercase scheme recorded verbatim (valid), not lowercased by guess", verbatim=["HTTPS://ok.example/"])
add(73, "id-whitespace", {"@id": "  https://s.example/#x  ", "@type": "Thing"}, "BOUNDED_SUCCESS",
    "@id whitespace preserved verbatim with flag; never trimmed silently", flags=["whitespace_id"])
add(74, "name-whitespace", {"@type": "LocalBusiness", "name": "  Acme  "}, "BOUNDED_SUCCESS",
    "name whitespace preserved verbatim with flag", flags=["whitespace_name"])
add(75, "desc-json-looking", {"@type": "LocalBusiness", "description": '{"not": "json-ld"} just text'}, "BOUNDED_SUCCESS",
    "JSON-looking description stays inert string", flags=["inert_string"])
add(76, "disambiguating-desc", {"@type": "LocalBusiness", "description": "A", "disambiguatingDescription": "B"}, "BOUNDED_SUCCESS",
    "description variants kept separate")
add(77, "hasmap-query", {"@type": "LocalBusiness", "hasMap": "https://maps.example/?q=acme&z=15"}, "BOUNDED_SUCCESS",
    "map URL recorded with query, never fetched", flags=["untrusted_ref"])
add(78, "map-relative", {"@type": "LocalBusiness", "hasMap": "/map"}, "BOUNDED_SUCCESS",
    "relative map -> unresolved_ref", flags=["unresolved_ref"])
add(79, "validthrough-inverted", {"@type": "LocalBusiness", "openingHoursSpecification":
    {"dayOfWeek": "Monday", "validFrom": "2026-12-01", "validThrough": "2026-01-01"}}, "BOUNDED_SUCCESS",
    "inverted validity range flagged, kept verbatim", flags=["inverted_range"])
add(80, "geo-elevation", {"@type": "GeoCoordinates", "latitude": 39.0, "longitude": -108.0, "elevation": "1400m"}, "BOUNDED_SUCCESS",
    "elevation verbatim")
add(81, "country-object", {"@type": "PostalAddress", "addressCountry": {"@type": "Country", "name": "USA"}}, "BOUNDED_SUCCESS",
    "country object verbatim")
add(82, "tel-plus1", {"@type": "LocalBusiness", "telephone": "+1 (555) 111-2222"}, "BOUNDED_SUCCESS",
    "E.164-ish phone verbatim", verbatim=["+1 (555) 111-2222"])
add(83, "fax-present", {"@type": "LocalBusiness", "faxNumber": "(555) 999-0000"}, "BOUNDED_SUCCESS",
    "faxNumber verbatim (obsolete but data)")
add(84, "contactoption", {"@type": "LocalBusiness", "contactPoint":
    {"@type": "ContactPoint", "contactOption": "TollFree", "telephone": "(800) 111-2222"}}, "BOUNDED_SUCCESS",
    "contactOption verbatim")
add(85, "available-language", {"@type": "LocalBusiness", "availableLanguage": ["en", "es"]}, "BOUNDED_SUCCESS",
    "availableLanguage verbatim")
add(86, "smoking-bool", {"@type": "LocalBusiness", "smokingAllowed": False}, "BOUNDED_SUCCESS",
    "boolean verbatim (JSON false, not string)")
add(87, "accessible-maybe", {"@type": "LocalBusiness", "isAccessibleForFree": "maybe"}, "BOUNDED_SUCCESS",
    "non-boolean isAccessibleForFree verbatim with flag", flags=["type_mismatch_verbatim"])
add(88, "capacity-negative", {"@type": "Event", "maximumAttendeeCapacity": -5}, "BOUNDED_SUCCESS",
    "negative capacity flagged range_suspect, verbatim", flags=["range_suspect"])
add(89, "event-cancelled", {"@type": "Event", "eventStatus": "https://schema.org/EventCancelled", "name": "Show"}, "BOUNDED_SUCCESS",
    "cancelled status verbatim")
add(90, "price-zero-string", {"@type": "Product", "offers": {"@type": "Offer", "price": "0"}}, "BOUNDED_SUCCESS",
    'price "0" string verbatim: free-vs-missing distinction preserved', verbatim=['"price": "0"'])
add(91, "price-zero-number", {"@type": "Product", "offers": {"@type": "Offer", "price": 0}}, "BOUNDED_SUCCESS",
    "price 0 number verbatim: distinct from string '0'", verbatim=['"price": 0'])
add(92, "availability-url", {"@type": "Product", "offers": {"@type": "Offer", "availability": "https://schema.org/InStock"}}, "BOUNDED_SUCCESS",
    "availability URL-form verbatim")
add(93, "item-condition", {"@type": "Product", "offers": {"@type": "Offer", "itemCondition": "https://schema.org/UsedCondition"}}, "BOUNDED_SUCCESS",
    "itemCondition verbatim")
add(94, "seller-string", {"@type": "Product", "offers": {"@type": "Offer", "seller": "Acme"}}, "BOUNDED_SUCCESS",
    "string seller verbatim; no Organization synthesis")
add(95, "price-negative", {"@type": "Product", "offers": {"@type": "Offer", "price": -10, "priceCurrency": "USD"}}, "BOUNDED_SUCCESS",
    "negative price flagged range_suspect, verbatim", flags=["range_suspect"])
add(96, "currency-words", {"@type": "Product", "offers": {"@type": "Offer", "price": 5, "priceCurrency": "US dollars"}}, "BOUNDED_SUCCESS",
    "priceCurrency words verbatim, never ISO-normalized", verbatim=["US dollars"])
add(97, "validfrom-future", {"@type": "Offer", "validFrom": "2027-01-01"}, "BOUNDED_SUCCESS",
    "validFrom string verbatim; never parsed to canonical datetime", verbatim=["2027-01-01"])
add(98, "graph-55-items", {"@graph": [{"@type": "LocalBusiness", "name": f"B{i}"} for i in range(55)]}, "BOUNDED_SUCCESS",
    "55 @graph items kept with count note", flags=["item_count=55"])
add(99, "duplicate-blocks", [dict({"@type": "LocalBusiness", "name": "Dup"}),
                             dict({"@type": "LocalBusiness", "name": "Dup"})], "BOUNDED_SUCCESS",
    "byte-identical duplicate blocks: both recorded with duplicate_bytes flag, no silent dedup",
    flags=["duplicate_bytes"])

manifest = []
for c in CASES:
    mid = f"ACQ-{c['mission_no']:04d}"
    fname = f"{mid}-{c['slug']}.json"
    payload = c["doc_raw"] if c["is_raw"] else json.dumps(c["doc_raw"])
    with open(os.path.join(FX, fname), "w", encoding="utf-8") as f:
        f.write(payload)
    manifest.append({k: v for k, v in c.items() if k not in ("doc_raw", "is_raw")})
with open(os.path.join(WORK, "manifest-0301-0350.json"), "w") as f:
    json.dump(manifest, f, indent=1)
print("wrote", len(CASES))
