#!/usr/bin/env python3
"""F2-CORPUS-B: generate 4 redacted synthetic fixtures (trades/services).

Deterministic: identical bytes on every run (pinned timestamps, fixed key order).
Writes fixtures to ../fixtures/ and updates ../manifests/batch-b.json (rerun-safe:
entries with identical digests keep prior status/generated_at).

Run: python3 gen-batch-b.py
"""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

CORPUS = os.path.dirname(os.path.abspath(__file__))
FIX_DIR = os.path.join(CORPUS, "fixtures")
MAN_DIR = os.path.join(CORPUS, "manifests")
MANIFEST_PATH = os.path.join(MAN_DIR, "batch-b.json")

TS = "2026-09-23T18:45:00Z"  # pinned; keeps reruns byte-identical
CONTROLLER = "identity_fyd_fixture_batch_b"
MARKER = "DEMO_SYNTHETIC"
ALLOWED_SCHEMAS = {
    "ping.social.business@1",
    "ping.social.service@1",
    "ping.social.location@1",
    "ping.social.person@1",
    "ping.social.external_identity@1",
    "ping.social.post@1",
    "ping.social.article@1",
}


def obj(oid, schema, title, description, fields, site_id):
    return {
        "id": oid,
        "schema": schema,
        "controllerId": CONTROLLER,
        "visibility": "public",
        "title": title,
        "description": description,
        "fields": dict(fields, claimKind="synthetic_statement"),
        "createdAt": TS,
        "updatedAt": TS,
        "provenance": {
            "kind": "synthetic",
            "ref": "fixture:synthetic:%s" % site_id,
            "derivedAt": TS,
        },
    }


def rel(rid, subject, predicate, objid, evidence):
    return {
        "id": rid,
        "subject": subject,
        "predicate": predicate,
        "object": objid,
        "status": "active",
        "createdAt": TS,
        "evidenceRef": evidence,
    }


def envelope(site_id, variant, business, objects, relationships):
    return {
        "site_id": site_id,
        "redacted": True,
        "synthetic_marker": MARKER,
        "variant": variant,
        "fixture_batch": "b",
        "generated_at": TS,
        "graph": {"objects": objects, "relationships": relationships},
    }


# ---------------------------------------------------------------- landscaper
def landscaper():
    sid = "f2b-alder-creek-landscaping"
    biz = "fixture-b-alder-creek"
    services = [
        ("Lawn mowing", "Weekly and biweekly mowing with clean edges."),
        ("Edging and trimming", "Crisp edges along walks, beds, and driveways."),
        ("Leaf removal", "Seasonal leaf pickup and hauling."),
        ("Mulch installation", "Fresh mulch to protect beds and cut weeds."),
        ("Garden bed design", "Simple planting plans for sunny and shady spots."),
        ("Planting beds", "Bed prep, soil amendments, and new plantings."),
        ("Shrub pruning", "Shaping and health pruning for shrubs."),
        ("Tree trimming", "Small tree pruning for clearance and shape."),
        ("Hedge shaping", "Straight, even hedges all season."),
        ("Sod installation", "New sod lawns graded and laid."),
        ("Overseeding", "Thicker lawns from seed blended into existing turf."),
        ("Core aeration", "Loosen compacted soil so roots can breathe."),
        ("Fertilization", "Seasonal feeding tuned to our climate."),
        ("Weed control", "Pre and post emergent weed programs."),
        ("Irrigation installation", "New sprinkler zones and full systems."),
        ("Irrigation repair", "Head replacement, leak fixes, and valve work."),
        ("Sprinkler winterization", "Blowouts before the first hard freeze."),
        ("Drainage solutions", "Grading and drains for soggy low spots."),
        ("Retaining walls", "Short walls that hold back slopes."),
        ("Paver patios", "Patios, walkways, and fire pit pads."),
        ("Walkways", "Step and path installs for front yards."),
        ("Outdoor lighting", "Low voltage path and accent lighting."),
        ("Fire pits", "Built in fire pits with seating walls."),
        ("Seasonal cleanup", "Spring wake up and fall close out visits."),
    ]
    objs = [
        obj(biz, "ping.social.business@1", "Alder Creek Landscaping",
            "Synthetic demo landscaper for FYD factory stress testing.",
            {
                "phone": "(970) 555-0121",
                "email": "hello@alder-creek-landscaping.example.com",
                "website": "https://alder-creek-landscaping.example.com",
                "locality": "Grand Junction, CO, US",
                "area_served": "Grand Junction, Fruita, and Palisade, Colorado",
                "price_range": "$$",
            }, sid),
        obj(biz + "-loc-gj", "ping.social.location@1", "Grand Junction, CO, US",
            "Coarse public location claim from the synthetic fixture.",
            {
                "address_locality": "Grand Junction",
                "address_region": "CO",
                "address_country": "US",
                "locality": "Grand Junction, CO, US",
            }, sid),
        obj(biz + "-person-sam", "ping.social.person@1", "Sam Delgado",
            "Synthetic crew member in the fixture.",
            {"name": "Sam Delgado", "role": "Crew lead"}, sid),
        obj(biz + "-ext-fb", "ping.social.external_identity@1", "Alder Creek on Facebook",
            "Synthetic social identity in the fixture.",
            {"url": "https://facebook.example.com/alder-creek-landscaping", "platform": "facebook"}, sid),
    ]
    rels = [
        rel("rel-b-alder-located", biz, "located_at", biz + "-loc-gj",
            "fixture:synthetic:%s:postal-address" % sid),
        rel("rel-b-alder-works", biz + "-person-sam", "works_for", biz,
            "fixture:synthetic:%s:team" % sid),
        rel("rel-b-alder-links", biz, "links_to", biz + "-ext-fb",
            "fixture:synthetic:%s:social" % sid),
    ]
    for i, (name, desc) in enumerate(services, 1):
        soid = "%s-service-%02d" % (biz, i)
        objs.append(obj(soid, "ping.social.service@1", name, desc,
                        {"name": name, "description": desc,
                         "service_href": "https://alder-creek-landscaping.example.com/services/%02d" % i},
                        sid))
        rels.append(rel("rel-b-alder-offer-%02d" % i, biz, "offers", soid,
                        "fixture:synthetic:%s:service-card:%02d" % (sid, i)))
    return envelope(sid, "landscaper: 20+ services (stress)", "Alder Creek Landscaping", objs, rels)


# -------------------------------------------------------------- pest control
def pest():
    sid = "f2b-mesa-shield-pest"
    biz = "fixture-b-mesa-shield"
    objs = [
        obj(biz, "ping.social.business@1", "Mesa Shield Pest Control",
            "Synthetic demo pest control company for FYD factory testing.",
            {
                "phone": "(970) 555-0124",
                "email": "contact@mesa-shield-pest.example.com",
                "website": "https://mesa-shield-pest.example.com",
                "locality": "Fruita, CO, US",
                "area_served": "Fruita and Loma, Colorado",
                "price_range": "$",
            }, sid),
        obj(biz + "-loc-fruita", "ping.social.location@1", "Fruita, CO, US",
            "Coarse public location claim from the synthetic fixture.",
            {
                "address_locality": "Fruita",
                "address_region": "CO",
                "address_country": "US",
                "locality": "Fruita, CO, US",
            }, sid),
        obj(biz + "-service-01", "ping.social.service@1", "General Pest Treatment",
            "Quarterly visits covering common household pests.",
            {
                "name": "General Pest Treatment",
                "description": "Quarterly visits covering common household pests.",
                "service_href": "https://mesa-shield-pest.example.com/services/treatment",
            }, sid),
        obj(biz + "-person-jordan", "ping.social.person@1", "Jordan Reyes",
            "Synthetic team member in the fixture.",
            {"name": "Jordan Reyes", "role": "Service technician"}, sid),
    ]
    rels = [
        rel("rel-b-pest-offer-01", biz, "offers", biz + "-service-01",
            "fixture:synthetic:%s:service-card:01" % sid),
        rel("rel-b-pest-located", biz, "located_at", biz + "-loc-fruita",
            "fixture:synthetic:%s:postal-address" % sid),
        rel("rel-b-pest-works", biz + "-person-jordan", "works_for", biz,
            "fixture:synthetic:%s:team" % sid),
    ]
    return envelope(sid, "pest control: single service", "Mesa Shield Pest Control", objs, rels)


# ------------------------------------------------------- general contractor
def contractor():
    sid = "f2b-cottonwood-ridge-contracting"
    biz = "fixture-b-cottonwood"
    services = [
        ("Kitchen remodels", "Cabinet, counter, and layout updates for kitchens."),
        ("Bathroom remodels", "Tile, fixtures, and layout updates for bathrooms."),
        ("Room additions", "Permitted additions tied into the existing home."),
        ("Deck construction", "Wood and composite decks with railings."),
    ]
    locations = [
        ("Grand Junction", "Grand Junction, CO, US"),
        ("Fruita", "Fruita, CO, US"),
        ("Palisade", "Palisade, CO, US"),
    ]
    objs = [
        obj(biz, "ping.social.business@1", "Cottonwood Ridge Contracting",
            "Synthetic demo general contractor for FYD factory testing.",
            {
                "phone": "(970) 555-0129",
                "email": "bids@cottonwood-ridge-contracting.example.com",
                "website": "https://cottonwood-ridge-contracting.example.com",
                "locality": "Grand Junction, CO, US",
                "area_served": "Grand Junction, Fruita, and Palisade, Colorado",
                "price_range": "$$$",
            }, sid),
        obj(biz + "-person-chris", "ping.social.person@1", "Chris Alvarez",
            "Synthetic team member in the fixture.",
            {"name": "Chris Alvarez", "role": "Project manager"}, sid),
    ]
    rels = [
        rel("rel-b-gc-works", biz + "-person-chris", "works_for", biz,
            "fixture:synthetic:%s:team" % sid),
    ]
    for i, (name, desc) in enumerate(services, 1):
        soid = "%s-service-%02d" % (biz, i)
        objs.append(obj(soid, "ping.social.service@1", name, desc,
                        {"name": name, "description": desc,
                         "service_href": "https://cottonwood-ridge-contracting.example.com/services/%02d" % i},
                        sid))
        rels.append(rel("rel-b-gc-offer-%02d" % i, biz, "offers", soid,
                        "fixture:synthetic:%s:service-card:%02d" % (sid, i)))
    for i, (loc, label) in enumerate(locations, 1):
        loid = "%s-loc-%02d" % (biz, i)
        objs.append(obj(loid, "ping.social.location@1", label,
                        "Coarse public location claim from the synthetic fixture.",
                        {
                            "address_locality": loc,
                            "address_region": "CO",
                            "address_country": "US",
                            "locality": label,
                        }, sid))
        rels.append(rel("rel-b-gc-located-%02d" % i, biz, "located_at", loid,
                        "fixture:synthetic:%s:postal-address:%02d" % (sid, i)))
    return envelope(sid, "general contractor: 3 locations", "Cottonwood Ridge Contracting", objs, rels)


# ---------------------------------------------------------- cleaning service
def cleaning():
    sid = "f2b-clearwater-cleaning"
    biz = "fixture-b-clearwater"
    # Minimal fixture: no person objects, sparse evidence refs, minimal fields.
    objs = [
        obj(biz, "ping.social.business@1", "Clearwater Cleaning Co",
            "Synthetic demo cleaning service for FYD factory testing.",
            {
                "phone": "(970) 555-0134",
                "email": "hello@clearwater-cleaning.example.com",
                "website": "https://clearwater-cleaning.example.com",
                "locality": "Clifton, CO, US",
            }, sid),
        obj(biz + "-loc-clifton", "ping.social.location@1", "Clifton, CO, US",
            "Coarse public location claim from the synthetic fixture.",
            {
                "address_locality": "Clifton",
                "address_region": "CO",
                "address_country": "US",
                "locality": "Clifton, CO, US",
            }, sid),
        obj(biz + "-service-01", "ping.social.service@1", "Home cleaning",
            "Recurring home cleaning visits.",
            {"name": "Home cleaning", "description": "Recurring home cleaning visits."}, sid),
        obj(biz + "-service-02", "ping.social.service@1", "Move-out cleaning",
            "One time deep cleans for moves.",
            {"name": "Move-out cleaning", "description": "One time deep cleans for moves."}, sid),
    ]
    rels = [
        rel("rel-b-clean-offer-01", biz, "offers", biz + "-service-01", "fixture:synthetic"),
        rel("rel-b-clean-offer-02", biz, "offers", biz + "-service-02", "fixture:synthetic"),
        rel("rel-b-clean-located", biz, "located_at", biz + "-loc-clifton", "fixture:synthetic"),
    ]
    return envelope(sid, "cleaning service: no people, minimal evidence", "Clearwater Cleaning Co", objs, rels)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    os.makedirs(FIX_DIR, exist_ok=True)
    os.makedirs(MAN_DIR, exist_ok=True)
    specs = [
        ("batch-b-landscaper.json", landscaper()),
        ("batch-b-pest-control.json", pest()),
        ("batch-b-general-contractor.json", contractor()),
        ("batch-b-cleaning-service.json", cleaning()),
    ]
    entries = []
    for fname, fixture in specs:
        path = os.path.join(FIX_DIR, fname)
        text = json.dumps(fixture, indent=2, ensure_ascii=False) + "\n"
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        digest = sha256_file(path)
        entries.append({
            "site_id": fixture["site_id"],
            "fixture_path": "fixtures/" + fname,
            "fixture_digest": "sha256:" + digest,
            "status": "ready",
            "variant": fixture["variant"],
            "synthetic_marker": MARKER,
            "object_count": len(fixture["graph"]["objects"]),
            "relationship_count": len(fixture["graph"]["relationships"]),
        })
    # Rerun-safe manifest: preserve status/generated_at for unchanged digests.
    prior = {}
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, encoding="utf-8") as f:
                old = json.load(f)
            for e in old.get("fixtures", []):
                prior[e["site_id"]] = e
        except (json.JSONDecodeError, OSError):
            prior = {}
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    out_entries = []
    changed = len(prior) != len(entries)
    for e in entries:
        p = prior.get(e["site_id"])
        if p and p.get("fixture_digest") == e["fixture_digest"]:
            out_entries.append(p)
        else:
            e["first_generated_at"] = p.get("first_generated_at", now) if p else now
            e["last_generated_at"] = now
            out_entries.append(e)
            changed = True
    manifest = {
        "batch": "b",
        "trade_segment": "trades/services",
        "generator": "F2-CORPUS-B",
        "manifest_path": "manifests/batch-b.json",
        "last_generated_at": now,
        "rerun_note": "entries with identical fixture_digest keep prior status and generated_at; rewritten only on digest change",
        "fixtures": out_entries,
    }
    new_text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            old_text = f.read()
        if old_text == new_text:
            print("manifest unchanged (all digests identical)")
            return
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write(new_text)
    print("manifest written/updated: %d fixtures" % len(out_entries))


if __name__ == "__main__":
    sys.exit(main())
