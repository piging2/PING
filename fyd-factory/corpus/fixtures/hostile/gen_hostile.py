#!/usr/bin/env python3
"""SYNTH-HOSTILE fixture generator: ~40 deliberately hostile synthetic fixtures.

TESTING ONLY. Every fixture carries synthetic=true and a testing-only marker.
Never present these as real prospects. Never use real business names.
"""
import json, os, datetime, sys

OUT = os.path.expanduser("~/workspace/fyd-factory/corpus/fixtures/hostile")
os.makedirs(OUT, exist_ok=True)

TS = "2026-09-23T20:00:00Z"
CTRL = "identity_fyd_fixture_hostile"

PHONE_POOL = [f"(970) 555-01{i:02d}" for i in range(100)]
_phone_cursor = 0
def phone():
    global _phone_cursor
    p = PHONE_POOL[_phone_cursor]
    _phone_cursor += 1
    return p

def obj(oid, schema, title, description, fields, provenance=None):
    return {
        "id": oid, "schema": schema, "controllerId": CTRL, "visibility": "public",
        "title": title, "description": description,
        "fields": dict(fields, claimKind="synthetic_statement"),
        "createdAt": TS, "updatedAt": TS,
        "provenance": provenance or {
            "kind": "synthetic", "ref": f"fixture:synthetic:{oid}",
            "derivedAt": TS},
    }

def rel(fx, n, subj, pred, ob, evidence):
    return {
        "id": f"rel-{fx}-{n:04d}", "subject": subj, "predicate": pred,
        "object": ob, "status": "active", "createdAt": TS,
        "evidenceRef": evidence,
    }

def biz_base(fx, name, desc, biz_type, extra_fields, observed_at=TS):
    f = {"phone": phone(), "business_type": biz_type}
    f.update(extra_fields)
    return obj(f"{fx}-biz", "ping.social.business@1", name, desc, f,
               provenance={"kind": "synthetic", "ref": f"fixture:synthetic:{fx}",
                           "derivedAt": TS, "observed_at": observed_at})

def loc_obj(fx, city):
    return obj(f"{fx}-loc", "ping.social.location@1", f"{city}, CO",
               f"Coarse public location claim for synthetic fixture {fx}.",
               {"address_locality": city, "address_region": "CO",
                "address_country": "US", "locality": f"{city}, CO"})

def person_obj(fx, name, role):
    return obj(f"{fx}-p-{role.replace(' ','-').lower()}", "ping.social.person@1",
               f"{name} ({role})",
               f"Person listed for synthetic fixture {fx}: {name}, {role}.",
               {"name": name, "role": role})

def service_obj(fx, i, name, desc, cat="service"):
    return obj(f"{fx}-svc-{i:03d}", "ping.social.service@1", name, desc,
               {"name": name, "description": desc, "category": cat})

def fixture(sid, btype, thesis, failure_mode, hostile_props, objects, relationships,
            variant, notes=None):
    doc = {
        "site_id": sid, "redacted": True, "synthetic": True,
        "synthetic_marker": "TESTING_ONLY_SYNTHETIC",
        "testing_only": True,
        "variant": variant,
        "variation_thesis": thesis,
        "expected_failure_mode": failure_mode,
        "hostile_properties": hostile_props,
        "fixture_batch": "hostile",
        "generated_at": TS,
        "graph": {"objects": objects, "relationships": relationships},
    }
    if notes: doc["notes"] = notes
    path = os.path.join(OUT, f"{sid}.json")
    with open(path, "w") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=2)
    return path

CITIES = ["Grand Junction", "Fruita", "Palisade", "Delta", "Montrose", "Rifle"]
def city(i): return CITIES[i % len(CITIES)]

# ---------------------------------------------------------------- no-jsonld (4)
NOJSON = [
    ("hostile-nojsonld-trade", "trades", "Foothill Test Plumbing",
     "Synthetic test plumbing shop with no structured data anywhere."),
    ("hostile-nojsonld-food", "food", "Cinder Test Bakery",
     "Synthetic test bakery with no structured data anywhere."),
    ("hostile-nojsonld-prof", "professional", "Anchor Test Bookkeeping",
     "Synthetic test bookkeeping practice with no structured data anywhere."),
    ("hostile-nojsonld-retail", "retail", "Juniper Test Outfitters",
     "Synthetic test outdoor gear shop with no structured data anywhere."),
]
for j, (fx, btype, name, desc) in enumerate(NOJSON):
    objs = [
        biz_base(fx, name, desc, btype, {
            "website": f"https://{name.lower().split()[0]}test.example.com",
            "address": f"10 Test Bench Rd, {city(j)}, CO",
            "hours": "Mo-Fr 08:00-17:00",
            "structured_data_present": False,
            "jsonld_source_count": 0,
            "evidence_quality": "html-scrape-only",
            "conflicts": [
                "HOSTILE no-jsonld: zero JSON-LD found on website, social profiles, or directory listings. "
                "All claims derive from unstructured HTML scrape only. Phone, hours, and services are WEAK INDICATION."
            ],
        }),
        loc_obj(fx, city(j)),
        person_obj(fx, "Casey Rivera", "Owner"),
        service_obj(fx, 1, f"Primary {btype} service", "Core offering, claimed only in page H1 text."),
        obj(f"{fx}-ext", "ping.social.external_identity@1",
            f"https://social.example.com/{fx}",
            "Social profile placeholder; contains no structured business data.",
            {"url": f"https://social.example.com/{fx}", "platform": "social.example.com",
             "structured_data_present": False}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:html"),
        rel(fx, 2, f"{fx}-p-owner", "works_for", f"{fx}-biz", f"corpus:hostile:{fx}:html"),
        rel(fx, 3, f"{fx}-biz", "offers", f"{fx}-svc-001", f"corpus:hostile:{fx}:html"),
        rel(fx, 4, f"{fx}-biz", "links_to", f"{fx}-ext", f"corpus:hostile:{fx}:html"),
    ]
    fixture(fx, btype,
        "Stresses the compiler when zero JSON-LD exists: every claim is weak-indication HTML scrape.",
        "warn: emit low-confidence compilation with evidence_quality degraded; do not fail closed, do not invent structured fields.",
        ["no-jsonld", "html-scrape-only", "weak-indication"], objs, rels,
        f"{btype}: no structured data anywhere")

# ---------------------------------------------------------------- hours-conflict (4)
HOURSC = [
    ("hostile-hoursconf-trade", "trades", "Sagebrush Test Electric", "Mo-Fr 07:00-18:00"),
    ("hostile-hoursconf-hospitality", "hospitality", "Red Mesa Test Lodge", "Mo-Su 08:00-22:00"),
    ("hostile-hoursconf-food", "food", "Hatch Test Taqueria", "Tu-Su 11:00-21:00"),
    ("hostile-hoursconf-personal", "personal services", "Desert Bloom Test Nails", "Tu-Sa 10:00-19:00"),
]
for j, (fx, btype, name, site_hours) in enumerate(HOURSC):
    c = city(j)
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business with a hard Saturday hours conflict.",
                 btype, {
            "website": f"https://{fx}.example.com",
            "address": f"77 Test Mesa Ave, {c}, CO",
            "hours": f"{site_hours}; Sa conflicting (see conflicts)",
            "conflicts": [
                "HOURS CONFLICT: website claims Saturday 09:00-17:00. Directory listing (reserve.example.com) claims Saturday CLOSED. "
                "Both claims preserved; no canonical Saturday hours asserted.",
            ],
            "claim_saturday_website": "Sa 09:00-17:00",
            "claim_saturday_directory": "Sa closed",
        }),
        loc_obj(fx, c),
        obj(f"{fx}-ext-dir", "ping.social.external_identity@1",
            f"https://reserve.example.com/{fx}",
            "Directory listing carrying the conflicting Saturday claim.",
            {"url": f"https://reserve.example.com/{fx}", "platform": "reserve.example.com",
             "hours": "Mo-Fr 08:00-17:00; Sa closed",
             "phone": "(970) 555-0150"}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-biz", "links_to", f"{fx}-ext-dir", f"corpus:hostile:{fx}:directory"),
    ]
    fixture(fx, btype,
        "Stresses conflict preservation: Saturday open-9-5 on the website vs closed in the directory.",
        "warn: emit explicit HOURS CONFLICT flag; never pick a winner; quarantine any booking/scheduling projection until human verifies.",
        ["hours-conflict", "saturday-open-vs-closed", "preserved"], objs, rels,
        f"{btype}: Saturday 9-5 vs closed conflict")

# ---------------------------------------------------------------- hundred-services (4)
SVC_TYPES = ["trades", "food", "professional", "personal services"]
SVC_NAMES = ["Summit Test HVAC", "Copper Pan Test Diner", "Clear Ledger Test CPA", "Polished Test Salon"]
for j, (fx_pre, btype, name) in enumerate(zip(
        ["hostile-svc100-trade", "hostile-svc100-food", "hostile-svc100-prof", "hostile-svc100-personal"],
        SVC_TYPES, SVC_NAMES)):
    fx = fx_pre
    services = []
    for i in range(100):
        svc = service_obj(fx, i + 1, f"{name.split()[0]} Service #{i+1:03d}",
                          f"Synthetic service listing {i+1} of 100. Stress test for service fan-out.",
                          cat="trade-service" if btype == "trades" else btype)
        services.append(svc)
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business with exactly 100 services.",
                 btype, {
            "website": f"https://{fx}.example.com",
            "address": f"100 Test Way, {city(j)}, CO",
            "service_count": 100,
            "service_count_source": "website sitemap page",
            "conflicts": [
                "HOSTILE service-fanout: 100 services enumerated on the website. "
                "Directory listing only acknowledges ~12 core services. Count discrepancy preserved, not reconciled."
            ],
        }),
        loc_obj(fx, city(j)),
    ] + services
    rels = [rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site")]
    for i in range(100):
        rels.append(rel(fx, 2 + i, f"{fx}-biz", "offers", f"{fx}-svc-{i+1:03d}",
                        f"corpus:hostile:{fx}:sitemap"))
    fixture(fx, btype,
        "Stresses combinatorial fan-out: 100 service objects under one business with a count discrepancy.",
        "warn: compiler must page/cap service rendering and flag the 100-vs-12 count mismatch; must not silently drop services or crash.",
        ["hundred-services", "fan-out", "count-discrepancy"], objs, rels,
        f"{btype}: 100 services, sitemap vs directory mismatch")

# ---------------------------------------------------------------- unsafe-urls (4)
UNSAFE = [
    ("hostile-unsafeurl-trade", "trades", "Rusty Wrench Test Auto"),
    ("hostile-unsafeurl-food", "food", "Grease Fire Test BBQ"),
    ("hostile-unsafeurl-retail", "retail", "Bargain Bin Test Thrift"),
    ("hostile-unsafeurl-prof", "professional", "Shady Ledger Test Taxes"),
    ("hostile-unsafeurl-hospitality", "hospitality", "Trojan Horse Test Inn"),
]
for j, (fx, btype, name) in enumerate(UNSAFE):
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business with hostile URL schemes in website and social fields.",
                 btype, {
            "website": "javascript:alert('xss-test')",
            "website_alt": "data:text/html,<h1>hostile-test</h1>",
            "address": f"13 Test Alley, {city(j)}, CO",
            "conflicts": [
                "HOSTILE unsafe-url: website field contains javascript: scheme. website_alt contains data: scheme. "
                "Social profile contains vbscript: scheme. Compiler must sanitize or quarantine; never render raw."
            ],
        }),
        loc_obj(fx, city(j)),
        obj(f"{fx}-ext-social", "ping.social.external_identity@1",
            f"vbscript:msgbox('hostile-test')",
            "Social profile placeholder with a hostile vbscript: URL.",
            {"url": "vbscript:msgbox('hostile-test')", "platform": "social.example.com"}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-biz", "links_to", f"{fx}-ext-social", f"corpus:hostile:{fx}:social"),
    ]
    fixture(fx, btype,
        "Stresses URL sanitization: javascript:, data:, and vbscript: schemes injected into website and social fields.",
        "fail-closed: quarantine the URL fields, never emit them into rendered href/src; warn loudly in the evidence log.",
        ["unsafe-url", "javascript-scheme", "data-scheme", "vbscript-scheme", "sanitize"], objs, rels,
        f"{btype}: javascript/data/vbscript URL injection")

# ---------------------------------------------------------------- rtl-text (4)
RTL = [
    ("hostile-rtl-food", "food", "מסעדת סינתטית", "Hebrew synthetic restaurant"),
    ("hostile-rtl-personal", "personal services", "صالون تجريبي", "Arabic synthetic salon"),
    ("hostile-rtl-retail", "retail", "חנות מבחן", "Hebrew synthetic shop"),
    ("hostile-rtl-hospitality", "hospitality", "نُزُل تجريبي", "Arabic synthetic inn"),
    ("hostile-rtl-trade", "trades", "אינסטלטור טסט", "Hebrew synthetic plumber"),
]
RTL_DESC = {
    "hostile-rtl-food": "מסעדת טסט עם תיאור בעברית. Synthetic Hebrew test restaurant. מטבח מקומי.",
    "hostile-rtl-personal": "صالون تجريبي مع وصف باللغة العربية. Synthetic Arabic test salon. خدمات التجميل.",
    "hostile-rtl-retail": "חנות טסט עם תיאור בעברית. Synthetic Hebrew test shop. בגדים וכלי בית.",
    "hostile-rtl-hospitality": "نُزُل تجريبي مع وصف باللغة العربية. Synthetic Arabic test inn. إقامة مريحة.",
    "hostile-rtl-trade": "\u05d0\u05d9\u05e0\u05e1\u05d8\u05dc\u05d8\u05d5\u05e8 \u05d8\u05e1\u05d8 \u05e2\u05dd \u05ea\u05d9\u05d0\u05d5\u05e8 \u05d1\u05e2\u05d1\u05e8\u05d9\u05ea. Synthetic Hebrew test plumber."}
for j, (fx, btype, name, eng) in enumerate(RTL):
    objs = [
        biz_base(fx, name, f"{RTL_DESC[fx]} ({eng})", btype, {
            "website": f"https://{fx}.example.com",
            "address": f"1 Test Bazaar Ln, {city(j)}, CO",
            "phone": phone(),
            "conflicts": [
                "HOSTILE rtl: business name and description are right-to-left script (Hebrew/Arabic) mixed with Latin metadata. "
                "Bidi rendering and search indexing must not garble or invert the Latin segments."
            ],
        }),
        loc_obj(fx, city(j)),
        person_obj(fx, "Test Owner", "Owner"),
        service_obj(fx, 1, "שירות ראשי" if any(k in fx for k in ["rtl-food", "rtl-retail", "rtl-trade"]) else "خدمة رئيسية",
                    "Primary service, RTL title; description: synthetic test service."),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-p-owner", "works_for", f"{fx}-biz", f"corpus:hostile:{fx}:site"),
        rel(fx, 3, f"{fx}-biz", "offers", f"{fx}-svc-001", f"corpus:hostile:{fx}:site"),
    ]
    fixture(fx, btype,
        "Stresses bidirectional text handling: Hebrew/Arabic business names and descriptions mixed with Latin fields.",
        "warn: compiler must preserve RTL runs exactly, escape bidi control characters in HTML, and never reorder Latin metadata around RTL text.",
        ["rtl-text", "hebrew" if any(c in fx for c in ["food", "retail"]) else "arabic", "bidi"], objs, rels,
        f"{btype}: RTL name and description ({eng})")

# ---------------------------------------------------------------- franchise-lookalike (4)
FRAN = [
    ("hostile-franchise-food", "food", "QuickSlice Test Pizza"),
    ("hostile-franchise-trade", "trades", "FixRight Test Plumbing"),
    ("hostile-franchise-retail", "retail", "MegaMart Test Grocer"),
    ("hostile-franchise-personal", "personal services", "CurlUp Test Salon"),
    ("hostile-franchise-prof", "professional", "BrandUp Test Marketing"),
]
for j, (fx, btype, name) in enumerate(FRAN):
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business that LOOKS like a national franchise but is fictional.",
                 btype, {
            "website": f"https://www.{name.lower().replace(' ','').replace('test','')}.example.com",
            "address": f"500 Test Franchise Blvd, {city(j)}, CO",
            "hours": "Mo-Su 07:00-23:00",
            "brand_signals": ["national-style naming", "uniform logo across 3 locations in data", "call-center phone pattern"],
            "location_count_in_data": 3,
            "conflicts": [
                "HOSTILE franchise-lookalike: branding mimics a national chain (uniform naming, 3 locations in source data, central phone pattern) "
                "but every element is synthetic and fictional. Compiler must NOT merge this with any real chain and must NOT inherit real-chain hours/phone. "
                "Treat as independent unless a franchise disclosure document is observed."
            ],
        }),
        loc_obj(fx, city(j)),
        obj(f"{fx}-loc-2", "ping.social.location@1", f"De Beque, CO",
            "Second synthetic location claim feeding the franchise lookalike stress.",
            {"address_locality": "De Beque", "address_region": "CO", "address_country": "US"}),
        obj(f"{fx}-loc-3", "ping.social.location@1", f"Loma, CO",
            "Third synthetic location claim feeding the franchise lookalike stress.",
            {"address_locality": "Loma", "address_region": "CO", "address_country": "US"}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-biz", "also_located_at", f"{fx}-loc-2", f"corpus:hostile:{fx}:directory"),
        rel(fx, 3, f"{fx}-biz", "also_located_at", f"{fx}-loc-3", f"corpus:hostile:{fx}:directory"),
    ]
    fixture(fx, btype,
        "Stresses entity resolution: chain-like branding, three locations, central-phone pattern, but fully synthetic and independent.",
        "fail-closed: never merge with a real chain, never inherit chain-level claims; compile as an independent multi-location business with a franchise-lookalike warning.",
        ["franchise-lookalike", "entity-resolution", "multi-location"], objs, rels,
        f"{btype}: franchise-lookalike, do-not-merge")

# ---------------------------------------------------------------- stale-source (4)
STALE = [
    ("hostile-stale-trade", "trades", "Dusty Pipe Test Plumbing"),
    ("hostile-stale-food", "food", "Old Skillet Test Diner"),
    ("hostile-stale-prof", "professional", "Ledger Line Test Insurance"),
    ("hostile-stale-hospitality", "hospitality", "Cottonwood Test Motel"),
    ("hostile-stale-personal", "personal services", "Mothball Test Barbers"),
]
for j, (fx, btype, name) in enumerate(STALE):
    stale_ts = "2024-06-15T12:00:00Z"
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business whose only evidence is two years old.",
                 btype, {
            "website": f"https://{fx}.example.com",
            "address": f"9 Test Archive St, {city(j)}, CO",
            "hours": "Mo-Fr 09:00-17:00 (observed 2024, UNVERIFIED now)",
            "source_last_observed": stale_ts,
            "freshness": "stale: 2 years",
            "conflicts": [
                "HOSTILE stale-source: every claim was observed 2024-06-15, over two years ago. "
                "Hours, phone, and services may have changed. Do not present as current; mark freshness explicitly."
            ],
        }, observed_at=stale_ts),
        loc_obj(fx, city(j)),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:archive-2024"),
    ]
    fixture(fx, btype,
        "Stresses staleness: all evidence observed 2024-06-15, over two years old.",
        "warn: emit freshness annotations on every claim, quarantine time-sensitive claims (hours, prices), require re-observation before any outreach use.",
        ["stale-source", "two-years-old", "freshness"], objs, rels,
        f"{btype}: evidence from 2024-06-15")

# ---------------------------------------------------------------- contradictory-phone (4)
PHONEC = [
    ("hostile-phonec-trade", "trades", "Double Ring Test HVAC"),
    ("hostile-phonec-food", "food", "Two Tone Test Pizza"),
    ("hostile-phonec-retail", "retail", "Split Line Test Books"),
    ("hostile-phonec-personal", "personal services", "Crossed Wire Test Spa"),
]
for j, (fx, btype, name) in enumerate(PHONEC):
    p_site = phone()
    p_dir = phone()
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business where two sources disagree on the phone number.",
                 btype, {
            "website": f"https://{fx}.example.com",
            "address": f"22 Test Switchboard Ave, {city(j)}, CO",
            "phone": p_site,
            "phone_directory": p_dir,
            "conflicts": [
                f"PHONE CONFLICT: website lists {p_site}; directory listing (reserve.example.com) lists {p_dir}. "
                "Both claims preserved; no canonical phone asserted. Compiler must not dial either without human resolution."
            ],
        }),
        loc_obj(fx, city(j)),
        obj(f"{fx}-ext-dir", "ping.social.external_identity@1",
            f"https://reserve.example.com/{fx}",
            "Directory listing carrying the conflicting phone claim.",
            {"url": f"https://reserve.example.com/{fx}", "platform": "reserve.example.com",
             "phone": p_dir, "phone_conflicts_with": p_site}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-biz", "links_to", f"{fx}-ext-dir", f"corpus:hostile:{fx}:directory"),
    ]
    fixture(fx, btype,
        "Stresses phone conflict: website and directory disagree on the phone number.",
        "fail-closed: assert no canonical phone; block any call/dial action and flag the conflict in the evidence log.",
        ["contradictory-phone", "two-sources-disagree"], objs, rels,
        f"{btype}: website vs directory phone mismatch")

# ---------------------------------------------------------------- broken-media (4)
MEDIAC = [
    ("hostile-media-trade", "trades", "Snapshot Test Roofing"),
    ("hostile-media-food", "food", "Flash Bulb Test Sushi"),
    ("hostile-media-retail", "retail", "Pixel Dust Test Cameras"),
    ("hostile-media-hospitality", "hospitality", "Postcard Test Cabins"),
]
for j, (fx, btype, name) in enumerate(MEDIAC):
    objs = [
        biz_base(fx, name, f"Synthetic test {btype} business with broken or non-image media URLs.",
                 btype, {
            "website": f"https://{fx}.example.com",
            "address": f"404 Test Notfound Rd, {city(j)}, CO",
            "conflicts": [
                "HOSTILE broken-media: post-01 media_url is a 404. post-02 media_url is a PDF, not an image. "
                "post-03 media_url has an invalid scheme. Compiler must validate media before render; broken media quarantines, never renders broken."
            ],
        }),
        loc_obj(fx, city(j)),
        obj(f"{fx}-post-01", "ping.social.post@1", "Grand opening",
            "Post with a media URL that 404s.",
            {"headline": "Grand opening", "text": "We opened our doors. Synthetic test post.",
             "posted_at": "2026-09-20",
             "media_url": "https://media.example.com/broken/404-missing-image.jpg",
             "media_expected_status": "404"}),
        obj(f"{fx}-post-02", "ping.social.post@1", "Menu drop",
            "Post whose media URL is a PDF, not an image.",
            {"headline": "Menu drop", "text": "New menu is out. Synthetic test post.",
             "posted_at": "2026-09-19",
             "media_url": "https://media.example.com/broken/actual-document.pdf",
             "media_content_type": "application/pdf, not an image"}),
        obj(f"{fx}-post-03", "ping.social.post@1", "Team photo",
            "Post whose media URL has an invalid scheme.",
            {"headline": "Team photo", "text": "Meet the team. Synthetic test post.",
             "posted_at": "2026-09-18",
             "media_url": "ht!tp://media.example.com/broken/invalid-scheme.jpg",
             "media_expected_status": "invalid-scheme"}),
    ]
    rels = [
        rel(fx, 1, f"{fx}-biz", "located_at", f"{fx}-loc", f"corpus:hostile:{fx}:site"),
        rel(fx, 2, f"{fx}-biz", "publishes", f"{fx}-post-01", f"corpus:hostile:{fx}:social"),
        rel(fx, 3, f"{fx}-biz", "publishes", f"{fx}-post-02", f"corpus:hostile:{fx}:social"),
        rel(fx, 4, f"{fx}-biz", "publishes", f"{fx}-post-03", f"corpus:hostile:{fx}:social"),
    ]
    fixture(fx, btype,
        "Stresses media validation: a 404 image, a non-image PDF in an image field, and an invalid URL scheme.",
        "fail-closed: validate every media URL before render; quarantine the 404, the PDF, and the invalid scheme; never hotlink unverified media.",
        ["broken-media", "404-image", "non-image-media", "invalid-scheme"], objs, rels,
        f"{btype}: 404 + PDF + invalid-scheme media")

count = len([f for f in os.listdir(OUT) if f.endswith(".json")])
print(f"generated {count} fixtures in {OUT}")
