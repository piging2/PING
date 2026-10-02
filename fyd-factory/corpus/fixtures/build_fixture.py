#!/usr/bin/env python3
"""FIXTURE-SECOND: build the synthetic second-site plumbing fixture.

Deterministic. Writes ~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json
Schema matches /home/nolan/ping/var/fyd-projections/{happy-place,coppersmith-plumbing}.json:
top keys meta/graph/presentationIntent; object keys id/schema/controllerId/visibility/
title/description/fields/createdAt/updatedAt/provenance{kind,ref,derivedAt};
relationship keys id/subject/predicate/object/status/createdAt/evidenceRef.
"""
import json, hashlib, re, sys
from pathlib import Path

TS = "2026-09-24T00:30:00Z"
OUT = Path.home() / "workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json"

BIZ = "cw-biz-01"

def prov(kind, ref):
    return {"kind": kind, "ref": ref, "derivedAt": TS}

def obj(oid, schema, title, description, fields, provenance, visibility="public"):
    return {
        "id": oid, "schema": schema, "controllerId": "fixture_synthetic",
        "visibility": visibility, "title": title, "description": description,
        "fields": fields, "createdAt": TS, "updatedAt": TS, "provenance": provenance,
    }

def rel(rid, subject, predicate, object_, evidence_ref):
    return {"id": rid, "subject": subject, "predicate": predicate, "object": object_,
            "status": "active", "createdAt": TS, "evidenceRef": evidence_ref}

SITE_URL = "https://clearwater-plumbing.example.com/"
WEB = prov("website-derived", "website-ingestion:" + SITE_URL)
GBP = prov("directory-derived", "directory:google-business-profile")
FB = prov("website-derived", "website-ingestion:" + SITE_URL + "contact/")
OWNER = prov("owner-asserted", "owner-interview:synthetic")

objects = []
rels = []

# --- business ---
objects.append(obj(
    BIZ, "ping.social.business@1", "Clearwater Plumbing Co.",
    "Clearwater Plumbing Co. is a family-run plumbing shop serving the Grand Junction area. "
    "Drain cleaning, water heaters, sewer lines, and 24/7 emergency service, with upfront "
    "flat-rate pricing agreed before work begins.",
    {
        "title": "Clearwater Plumbing Co.",
        "description": "Family-run plumbing shop serving the Grand Junction area. Drain cleaning, "
                       "water heaters, sewer lines, and 24/7 emergency service.",
        "phone": "(970) 555-0142",
        "email": "hello@clearwater-plumbing.example.com",
        "website": SITE_URL,
        "hours": "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM; Emergency service 24/7",
        "area_served": "Grand Junction, Fruita, Palisade, Clifton, Loma, Mack, De Beque, Delta",
        "locality": "Grand Junction, Colorado",
        "licensed_insured": "Licensed and insured",
        "warranty": "2-year workmanship warranty on labor",
        "pricing": "Upfront flat-rate pricing agreed before work begins",
        "response": "Same-day appointments when you call before noon",
        "claimKind": "website_statement",
    }, WEB))

# --- services (12) ---
services = [
    ("cw-svc-01", "Drain cleaning",
     "Clears slow and clogged sinks, tubs, showers, and main lines with professional augers "
     "and hydro-jetting. Camera inspection shows you the blockage before we clear it.",
     {"price_hint": "Upfront flat-rate pricing"}),
    ("cw-svc-02", "Water heater installation and repair",
     "Repair and replacement of tank and tankless water heaters, sized to your household's "
     "hot-water demand. We haul the old unit away and register the new warranty.",
     {"price_hint": "Free replacement estimates"}),
    ("cw-svc-03", "Sewer line repair and replacement",
     "Camera inspection finds bellies, breaks, and root intrusion; we repair or replace the "
     "line with as little digging as the yard allows.",
     {}),
    ("cw-svc-04", "Electronic leak detection",
     "Acoustic and thermal imaging pinpoints hidden leaks behind walls and under slabs, so "
     "repairs open the smallest possible area.",
     {}),
    ("cw-svc-05", "Fixture installation",
     "Faucets, sinks, showers, and tubs installed to manufacturer spec, with supply lines "
     "and shutoffs checked while we are there.",
     {}),
    ("cw-svc-06", "Toilet repair and installation",
     "Running toilets, weak flushes, wax-ring leaks, and full replacements, including "
     "high-efficiency models that cut water use.",
     {}),
    ("cw-svc-07", "Garbage disposal installation",
     "Replacement and first-time installation of continuous-feed disposals, wired and plumbed "
     "to code with a dedicated switch.",
     {}),
    ("cw-svc-08", "Water softeners and filtration",
     "Whole-home softeners and point-of-use filtration for hard water, sediment, and taste. "
     "We test your water first and size the system to it.",
     {}),
    ("cw-svc-09", "Gas line installation and repair",
     "New gas runs for ranges, dryers, fire pits, and generators, plus leak investigation "
     "with pressure testing before the line goes live.",
     {}),
    ("cw-svc-10", "Whole-home repiping",
     "Replaces aging galvanized or polybutylene pipe with PEX or copper, usually in two to "
     "three days, with drywall patches kept to a minimum.",
     {}),
    ("cw-svc-11", "Sump pump installation",
     "Primary and battery-backup sump systems for basements and crawl spaces, with discharge "
     "routed away from the foundation.",
     {}),
    ("cw-svc-12", "24/7 emergency plumbing",
     "Burst pipes, major leaks, sewer backups, and no-hot-water calls answered around the "
     "clock by our on-call technician. After-hours work is quoted before dispatch.",
     {}),
]
for i, (sid, name, desc, extra) in enumerate(services, 1):
    fields = {"name": name, "description": desc, "claimKind": "website_statement"}
    fields.update(extra)
    objects.append(obj(sid, "ping.social.service@1", name, desc, fields, WEB))
    rels.append(rel(f"rel-cw-{i:03d}", BIZ, "provides", sid,
                    "fixture:synthetic:services-page"))

# --- people (3) ---
people = [
    ("cw-person-01", "Alex Morgan", "Owner and lead plumber",
     "Founded Clearwater Plumbing Co. and still walks every job before the crew starts. "
     "Signs off on finished work personally."),
    ("cw-person-02", "Jordan Lee", "Service technician",
     "Handles drain cleaning, leak calls, and water heater swaps. Carries the camera rig "
     "on every diagnostic visit."),
    ("cw-person-03", "Casey Brooks", "Office manager and dispatcher",
     "Answers the phones, builds the daily schedule, and follows up after every visit to "
     "make sure the work held."),
]
for j, (pid, name, role, desc) in enumerate(people, 1):
    objects.append(obj(pid, "ping.social.person@1", name, desc,
                       {"name": name, "role": role, "claimKind": "website_statement"}, OWNER))
    rels.append(rel(f"rel-cw-p{j:02d}", BIZ, "employs", pid, "fixture:synthetic:about-page"))

# --- locations (2) ---
locations = [
    ("cw-loc-01", "Grand Junction shop",
     "Main shop and dispatch office. Placeholder address; synthetic fixture.",
     {"locality": "Grand Junction, Colorado", "address": "1000 Example Street, Grand Junction, CO 81501",
      "address_locality": "Grand Junction", "address_region": "CO", "address_country": "US",
      "postal_code": "81501", "claimKind": "website_statement"}),
    ("cw-loc-02", "Fruita service depot",
     "Parts depot and second dispatch point for the west end of the valley. Placeholder address; synthetic fixture.",
     {"locality": "Fruita, Colorado", "address": "2000 Sample Avenue, Fruita, CO 81521",
      "address_locality": "Fruita", "address_region": "CO", "address_country": "US",
      "postal_code": "81521", "claimKind": "website_statement"}),
]
for k, (lid, name, desc, fields) in enumerate(locations, 1):
    objects.append(obj(lid, "ping.social.location@1", name, desc, fields, WEB))
    rels.append(rel(f"rel-cw-l{k:02d}", BIZ, "located_at", lid, "fixture:synthetic:contact-page"))

# --- external identities (2); GBP carries the CONFLICTING hours ---
objects.append(obj(
    "cw-ext-gbp-01", "ping.social.external_identity@1", "Clearwater Plumbing Co. on Google",
    "Google Business Profile listing. Note: Saturday hours here differ from the website; both are preserved.",
    {"platform": "google",
     "url": "https://www.google.com/maps/search/?api=1&query=Clearwater+Plumbing+Co+Grand+Junction+CO",
     "hours": "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 2:00 PM; Emergency service 24/7",
     "claimKind": "directory_statement"}, GBP))
rels.append(rel("rel-cw-e01", BIZ, "links_to", "cw-ext-gbp-01", "fixture:synthetic:directory-listing"))
objects.append(obj(
    "cw-ext-fb-01", "ping.social.external_identity@1", "Clearwater Plumbing Co. on Facebook",
    "Facebook page linked from the website footer.",
    {"platform": "facebook", "url": "https://www.facebook.com/clearwaterplumbingdemo",
     "claimKind": "website_statement"}, FB))
rels.append(rel("rel-cw-e02", BIZ, "links_to", "cw-ext-fb-01", "fixture:synthetic:website-footer"))

# --- FAQs as articles (5) ---
faqs = [
    ("cw-faq-01", "Do you charge for estimates?",
     "Estimates for replacements and larger projects are free. Diagnostic visits carry a flat "
     "fee, which we credit toward the repair if you approve the work on the spot."),
    ("cw-faq-02", "Do you really answer around the clock for emergencies?",
     "Yes. Burst pipes, major leaks, sewer backups, and no-hot-water calls go to our on-call "
     "technician 24/7. After-hours work is billed at the overtime rate, quoted before we dispatch."),
    ("cw-faq-03", "Which areas do you serve?",
     "Grand Junction, Fruita, Palisade, Clifton, Loma, Mack, De Beque, and Delta. Outside that "
     "ring, call us and we will tell you honestly whether we are the right shop for the job."),
    ("cw-faq-04", "What water heater brands do you install?",
     "We install the brands our local distributor stocks and warranties, and we name the exact "
     "model on your written quote so you can compare offers directly."),
    ("cw-faq-05", "How fast can you get a technician to me?",
     "Same-day appointments when you call before noon. Emergency calls jump the line. We give a "
     "two-hour arrival window and text when the technician is on the way."),
]
for m, (fid, q, a) in enumerate(faqs, 1):
    objects.append(obj(fid, "ping.social.article@1", q, a,
                       {"text": a, "tags": ["faq"], "claimKind": "website_statement"}, WEB))
    rels.append(rel(f"rel-cw-f{m:02d}", BIZ, "publishes", fid, "fixture:synthetic:faq-page"))

fixture = {
    "meta": {
        "siteId": "clearwater-plumbing-demo",
        "dumpedAt": TS,
        "dumperVersion": "fyd-projection-dump@1.1.0",
        "baseDigest": "synthetic",
        "fixtureFileDigest": "synthetic",
        "fixtureHeader": "Clearwater Plumbing Co. graph fixture: SYNTHETIC, hand-built, DEMO_SYNTHETIC. "
                         "Fully redacted fictional business; not a real company. Identity fields are "
                         "placeholders (555 phone, .example.com email, Example Street addresses).",
        "overlayEventIds": [],
        "graphDigest": "synthetic",
        "generatedAt": TS,
        "eventSequences": None,
        "conflictPair": {
            "description": "Saturday closing time disagrees between sources; both preserved with provenance.",
            "objectA": {"id": BIZ, "field": "hours",
                        "value": "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 12:00 PM; Emergency service 24/7",
                        "provenanceRef": "website-ingestion:" + SITE_URL},
            "objectB": {"id": "cw-ext-gbp-01", "field": "hours",
                        "value": "Mon-Fri 7:00 AM - 6:00 PM; Sat 8:00 AM - 2:00 PM; Emergency service 24/7",
                        "provenanceRef": "directory:google-business-profile"},
        },
    },
    "graph": {"objects": objects, "relationships": rels},
    "presentationIntent": {
        "directives": [],
        "provenance": {
            "kind": "owner-presentation-intent",
            "note": "Owner-approved presentation intents (PRESENTATION INTENT layer). Not source facts; "
                    "re-applied over the base graph on every dump. Journaled via FYD_SITE_OVERLAY events.",
            "eventIds": [],
        },
    },
}

# ---------------- validation ----------------
errors = []
def err(msg): errors.append(msg)

top = set(fixture.keys())
if top != {"meta", "graph", "presentationIntent"}:
    err(f"top-level keys mismatch: {sorted(top)}")

KNOWN_SCHEMAS = {"ping.social.business@1", "ping.social.service@1", "ping.social.location@1",
                 "ping.social.person@1", "ping.social.external_identity@1",
                 "ping.social.post@1", "ping.social.article@1"}
OBJ_KEYS = {"id", "schema", "controllerId", "visibility", "title", "description",
            "fields", "createdAt", "updatedAt", "provenance"}
REL_KEYS = {"id", "subject", "predicate", "object", "status", "subject", "object"}
ids = set()
for o in objects:
    if set(o.keys()) != OBJ_KEYS: err(f"object {o.get('id')} keys: {sorted(o.keys())}")
    if o["schema"] not in KNOWN_SCHEMAS: err(f"object {o['id']} unknown schema {o['schema']}")
    if not o["title"] or not o["description"]: err(f"object {o['id']} missing title/description")
    p = o["provenance"]
    if not p.get("kind") or not p.get("ref"): err(f"object {o['id']} provenance incomplete")
    if o["id"] in ids: err(f"duplicate object id {o['id']}")
    ids.add(o["id"])
    if o["visibility"] != "public": err(f"object {o['id']} visibility not public")

KNOWN_PREDS = {"provides", "offers", "located_at", "employs", "links_to", "publishes"}
for r in rels:
    if set(r.keys()) != {"id", "subject", "predicate", "object", "status", "createdAt", "evidenceRef"}:
        err(f"rel {r.get('id')} keys: {sorted(r.keys())}")
    if r["subject"] not in ids: err(f"rel {r['id']} bad subject {r['subject']}")
    if r["object"] not in ids: err(f"rel {r['id']} bad object {r['object']}")
    if r["predicate"] not in KNOWN_PREDS: err(f"rel {r['id']} bad predicate {r['predicate']}")

by_schema = {}
for o in objects:
    by_schema.setdefault(o["schema"], []).append(o["id"])
def count(s): return len(by_schema.get(s, []))
if count("ping.social.business@1") != 1: err("business count != 1")
if not (10 <= count("ping.social.service@1") <= 14): err(f"service count {count('ping.social.service@1')} out of 10-14")
if not (2 <= count("ping.social.person@1") <= 3): err("person count out of 2-3")
if count("ping.social.location@1") != 2: err("location count != 2")
if not (4 <= count("ping.social.article@1") <= 6): err("faq/article count out of 4-6")

# redaction checks
biz_fields = objects[0]["fields"]
if not re.fullmatch(r"\(970\) 555-01\d\d", biz_fields["phone"]): err("phone not (970) 555-01xx")
if not biz_fields["email"].endswith(".example.com"): err("email not .example.com")
if "DEMO_SYNTHETIC" not in fixture["meta"]["fixtureHeader"]: err("DEMO_SYNTHETIC marker missing")
blob = json.dumps(fixture)
for pat, label in [(r"CCB\s*#?\s*\d+", "license-number-like CCB"),
                   (r"[Ll]icense\s*(#|no\.?|number)\s*\d+", "license-number-like"),
                   (r"#\d{4,}", "hash-number-like credential")]:
    if re.search(pat, blob): err(f"redaction: found {label}")
# conflict pair genuinely differs and both ids exist
cp = fixture["meta"]["conflictPair"]
oa = next(o for o in objects if o["id"] == cp["objectA"]["id"])
ob = next(o for o in objects if o["id"] == cp["objectB"]["id"])
va = oa["fields"][cp["objectA"]["field"]]
vb = ob["fields"][cp["objectB"]["field"]]
if va == vb: err("conflict pair values do not differ")
if cp["objectA"]["value"] != va or cp["objectB"]["value"] != vb: err("conflictPair values out of sync with objects")

if errors:
    print("VALIDATION FAILED:")
    for e in errors: print(" -", e)
    sys.exit(1)

OUT.parent.mkdir(parents=True, exist_ok=True)
raw = json.dumps(fixture, indent=1, ensure_ascii=False) + "\n"
OUT.write_text(raw, encoding="utf-8")
digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
print(f"OK: wrote {OUT}")
print(f"objects={len(objects)} rels={len(rels)} services={count('ping.social.service@1')} "
      f"people={count('ping.social.person@1')} locations={count('ping.social.location@1')} "
      f"faqs={count('ping.social.article@1')}")
print(f"sha256={digest}")

# phone uniqueness across all fixture files on the Pig is checked separately via wsl-run;
# record local 555 check here
if len(set(re.findall(r"\(970\) 555-01\d\d", blob))) != 1:
    print("WARN: unexpected 555 phone count in fixture")
    sys.exit(1)
print("validation: PASS")
print(f"DIGEST:{digest}")
