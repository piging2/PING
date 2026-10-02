#!/usr/bin/env python3
"""F2-CORPUS-A: build 4 redacted synthetic trades fixtures (batch A).

Schema authority: ObjectGraph from src/fyd/sitespec/types.ts in the PING
repo (branch fyd-factory), matching the shape of
src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts and
src/fyd/proceduralize/__fixtures__/happy-place-graph.ts:
  PingObject { id, schema, controllerId, visibility, title, description,
               fields, createdAt, updatedAt, provenance, ownerFieldCorrections? }
  PingRelationship { id, subject, predicate, object, status, createdAt, evidenceRef }

Synthetic marking: every object uses provenance kind "overlay-authored"
(the exact kind for demo/overlay content: neither the website's own words
nor a recorded journal fact) and fields claimKind "synthetic_statement".
The fixture file carries a top-level meta block with marker DEMO_SYNTHETIC,
and the business object carries a DEMO_SYNTHETIC field. No real business
names, addresses, phones, or emails anywhere. No awards, no review counts,
no testimonials. No em dashes in fixture copy.

Rerun-safe: deterministic ids and pinned timestamps; a fixture file is
only rewritten when its canonical digest changed.
"""

import hashlib
import json
import sys
from pathlib import Path

CORPUS = Path.home() / "workspace" / "fyd-factory" / "corpus"
FIXDIR = CORPUS / "fixtures" / "batch-a"
MANDIR = CORPUS / "manifests"

TS = "2026-09-23T00:00:00Z"
CONTROLLER = "identity_fyd_factory_corpus"
PROV_REF_PREFIX = "fyd-factory:corpus:batch-a"
KNOWN_SCHEMAS = {
    "ping.social.business@1",
    "ping.social.location@1",
    "ping.social.person@1",
    "ping.social.service@1",
    "ping.social.external_identity@1",
}


def hx(*parts: str, n: int = 12) -> str:
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:n]


def prov(site_id: str) -> dict:
    return {
        "kind": "overlay-authored",
        "ref": f"{PROV_REF_PREFIX}:{site_id}",
        "derivedAt": TS,
    }


def obj(site_id: str, oid: str, schema: str, title: str, description: str,
         fields: dict, visibility: str = "public") -> dict:
    assert schema in KNOWN_SCHEMAS, schema
    full_fields = dict(fields)
    full_fields.setdefault("claimKind", "synthetic_statement")
    return {
        "id": oid,
        "schema": schema,
        "controllerId": CONTROLLER,
        "visibility": visibility,
        "title": title,
        "description": description,
        "fields": full_fields,
        "createdAt": TS,
        "updatedAt": TS,
        "provenance": prov(site_id),
    }


def rel(site_id: str, subject: str, predicate: str, objid: str, evidence: str) -> dict:
    return {
        "id": "rel-" + hx(site_id, subject, predicate, objid, n=16),
        "subject": subject,
        "predicate": predicate,
        "object": objid,
        "status": "active",
        "createdAt": TS,
        "evidenceRef": evidence,
    }


def business_obj(site_id: str, name: str, description: str, phone: str,
                 email: str, website: str, address: str, hours: str,
                 area_served, extra: dict | None = None) -> tuple[dict, str]:
    bid = f"corpus-{site_id}-{hx(site_id, 'business', n=16)}"
    fields = {
        "DEMO_SYNTHETIC": "true",
        "title": name,
        "description": description,
        "phone": phone,
        "email": email,
        "website": website,
        "address": address,
        "hours": hours,
        "area_served": area_served,
        "locale": "en_US",
        "type": "website",
    }
    if extra:
        fields.update(extra)
    return obj(site_id, bid, "ping.social.business@1", name, description, fields), bid


def location_obj(site_id: str, locality: str, region: str, postal: str,
                 country: str = "United States") -> tuple[dict, str]:
    lid = f"corpus-{site_id}-location-{hx(site_id, locality, n=12)}"
    title = f"{locality}, {region} {postal}"
    fields = {
        "address_locality": locality,
        "address_region": region,
        "postal_code": postal,
        "address_country": country,
        "locality": title,
    }
    desc = "Coarse public location claim. Synthetic placeholder for corpus testing."
    return obj(site_id, lid, "ping.social.location@1", title, desc, fields), lid


def person_obj(site_id: str, name: str, role: str) -> tuple[dict, str]:
    pid = f"corpus-{site_id}-person-{hx(site_id, name, n=12)}"
    fields = {"name": name, "role": role}
    desc = f"Person listed for the synthetic business: {name}, {role}."
    return obj(site_id, pid, "ping.social.person@1", name, desc, fields), pid


def service_obj(site_id: str, name: str, description: str,
                extra: dict | None = None) -> tuple[dict, str]:
    slug = name.lower().replace(" & ", "-").replace(" ", "-")
    sid = f"corpus-{site_id}-service-{hx(site_id, name, n=12)}"
    fields = {"name": name, "description": description}
    if extra:
        fields.update(extra)
    return obj(site_id, sid, "ping.social.service@1", name, description, fields), sid


def ext_identity_obj(site_id: str, label: str, url: str) -> tuple[dict, str]:
    eid = f"corpus-{site_id}-ext-{hx(site_id, url, n=12)}"
    fields = {"url": url, "platform": label}
    desc = "External profile placeholder for the synthetic business."
    return obj(site_id, eid, "ping.social.external_identity@1", url, desc, fields), eid


# ---------------------------------------------------------------- fixtures

def build_plumber() -> dict:
    """batch-a-plumber: SPARSE evidence. 4 services, 0 people, 1 location."""
    site_id = "batch-a-plumber"
    name = "Blue Mesa Plumbing"
    business, bid = business_obj(
        site_id, name,
        "Blue Mesa Plumbing handles residential plumbing work in the Grand Junction area. Call to schedule a visit.",
        "970-555-0101", "hello@bluemesaplumbing.example.com",
        "https://bluemesaplumbing.example.com",
        "1000 Fixture Way, Grand Junction, CO 81501",
        "Mo-Fr 08:00-17:00",
        ["Grand Junction", "Fruita", "Palisade"],
    )
    location, lid = location_obj(site_id, "Grand Junction", "Colorado", "81501")
    services = [
        ("Drain Cleaning", "Clearing slow and clogged drains in kitchens, bathrooms, and laundry lines."),
        ("Water Heater Service", "Repair and replacement of residential tank water heaters."),
        ("Leak Detection", "Finding the source of hidden leaks in walls, floors, and yards."),
        ("Sewer Line Repair", "Diagnosing and repairing damaged residential sewer lines."),
    ]
    objects = [business, location]
    relationships = [rel(site_id, bid, "located_at", lid,
                         f"corpus:batch-a:{site_id}:location")]
    for sname, sdesc in services:
        so, sid = service_obj(site_id, sname, sdesc)
        objects.append(so)
        relationships.append(rel(site_id, bid, "offers", sid,
                                 f"corpus:batch-a:{site_id}:services"))
    return fixture_doc(site_id, "plumber", objects, relationships)


def build_hvac() -> dict:
    """batch-a-hvac: RICH evidence. 7 services, 2 people, 1 location,
    external identity, booking URL."""
    site_id = "batch-a-hvac"
    name = "High Desert Heating & Air"
    business, bid = business_obj(
        site_id, name,
        "High Desert Heating & Air installs and services furnaces, air conditioners, and heat pumps for homes in the Grand Valley. Book online or call.",
        "970-555-0102", "service@highdesertair.example.com",
        "https://highdesertair.example.com",
        "2000 Placeholder Ave, Fruita, CO 81521",
        "Mo,Tu,We,Th,Fr,Sa 08:00-18:00",
        "Fruita, Grand Junction, Clifton, Palisade, and De Beque",
        extra={
            "price_range": "$$",
            "booking_url": "https://highdesertair.example.com/book",
        },
    )
    location, lid = location_obj(site_id, "Fruita", "Colorado", "81521")
    ext, eid = ext_identity_obj(
        site_id, "directory.example.com",
        "https://directory.example.com/high-desert-heating-air")
    people = []
    pids = []
    for pname, role in [("Dana Whitfield", "Owner"),
                        ("Marcus Bell", "Lead Technician")]:
        po, pid = person_obj(site_id, pname, role)
        people.append(po)
        pids.append(pid)
    services = [
        ("Furnace Repair", "Diagnosing and fixing common furnace problems before cold weather hits."),
        ("Furnace Installation", "Replacing aging furnaces with correctly sized new units."),
        ("Air Conditioner Repair", "Fixing AC units that blow warm air, short cycle, or leak."),
        ("Air Conditioner Installation", "Installing central air systems for homes without cooling."),
        ("Heat Pump Service", "Year-round maintenance and repair for heat pump systems."),
        ("Duct Cleaning", "Removing dust and debris buildup from residential ductwork."),
        ("Thermostat Installation", "Installing programmable and smart thermostats."),
    ]
    objects = [business, location, ext] + people
    relationships = [
        rel(site_id, bid, "located_at", lid,
            f"corpus:batch-a:{site_id}:postal-address"),
        rel(site_id, bid, "links_to", eid,
            f"corpus:batch-a:{site_id}:directory-listing"),
    ]
    for pid in pids:
        relationships.append(rel(site_id, pid, "works_for", bid,
                                 f"corpus:batch-a:{site_id}:team-page"))
    for sname, sdesc in services:
        slug = sname.lower().replace(" ", "-")
        so, sid = service_obj(site_id, sname, sdesc,
                              extra={"category": "residential-hvac"})
        objects.append(so)
        relationships.append(rel(site_id, bid, "offers", sid,
                                 f"corpus:batch-a:{site_id}:service:{slug}"))
    return fixture_doc(site_id, "hvac", objects, relationships)


def build_electrician() -> dict:
    """batch-a-electrician: RICHEST. 12 services, 3 people, 2 locations,
    external identity, contact form URL."""
    site_id = "batch-a-electrician"
    name = "Mesa Volt Electric"
    business, bid = business_obj(
        site_id, name,
        "Mesa Volt Electric provides residential and light commercial electrical work, plus a 24/7 emergency line.",
        "970-555-0103", "crew@mesavoltelectric.example.com",
        "https://mesavoltelectric.example.com",
        "3000 Synthetic Blvd, Grand Junction, CO 81501",
        "Mo,Tu,We,Th,Fr 07:00-17:00; 24/7 emergency line",
        ["Grand Junction", "Delta", "Montrose", "Olathe", "Cedaredge"],
        extra={
            "contact_form_url": "https://mesavoltelectric.example.com/contact",
            "emergency": "true",
        },
    )
    loc1, lid1 = location_obj(site_id, "Grand Junction", "Colorado", "81501")
    loc2, lid2 = location_obj(site_id, "Montrose", "Colorado", "81401")
    ext, eid = ext_identity_obj(
        site_id, "directory.example.com",
        "https://directory.example.com/mesa-volt-electric")
    people = []
    pids = []
    for pname, role in [("Priya Nair", "Owner, Master Electrician"),
                        ("Tom Okafor", "Journeyman Electrician"),
                        ("Lena Marsh", "Office Coordinator")]:
        po, pid = person_obj(site_id, pname, role)
        people.append(po)
        pids.append(pid)
    services = [
        ("Panel Upgrades", "Replacing outdated panels to handle modern electrical loads."),
        ("Ceiling Fan Installation", "Installing and balancing ceiling fans in any room."),
        ("Lighting Installation", "Indoor and recessed lighting installation and upgrades."),
        ("Outlet and Switch Repair", "Fixing dead outlets, faulty switches, and loose wiring."),
        ("EV Charger Installation", "Dedicated circuits and chargers for electric vehicles."),
        ("Whole-Home Surge Protection", "Panel-level surge protection for the whole house."),
        ("Smoke Detector Installation", "Hardwired smoke and CO detector installation."),
        ("Troubleshooting and Diagnostics", "Tracking down flickering lights, tripped breakers, and dead circuits."),
        ("Remodel Wiring", "Wiring for kitchen, bath, and basement remodel projects."),
        ("Generator Installation", "Standby generator hookups for outage protection."),
        ("Outdoor Lighting", "Landscape and security lighting design and installation."),
        ("Code Corrections", "Bringing older wiring up to current electrical code."),
    ]
    categories = ["install", "install", "install", "repair", "install", "install",
                  "install", "diagnostic", "install", "install", "install", "repair"]
    objects = [business, loc1, loc2, ext] + people
    relationships = [
        rel(site_id, bid, "located_at", lid1,
            f"corpus:batch-a:{site_id}:headquarters"),
        rel(site_id, bid, "located_at", lid2,
            f"corpus:batch-a:{site_id}:branch-office"),
        rel(site_id, bid, "links_to", eid,
            f"corpus:batch-a:{site_id}:directory-listing"),
    ]
    for pid in pids:
        relationships.append(rel(site_id, pid, "works_for", bid,
                                 f"corpus:batch-a:{site_id}:team-page"))
    for (sname, sdesc), cat in zip(services, categories):
        slug = sname.lower().replace(" ", "-")
        so, sid = service_obj(site_id, sname, sdesc,
                              extra={"category": cat,
                                     "service_area": "Grand Junction and Montrose offices"})
        objects.append(so)
        relationships.append(rel(site_id, bid, "offers", sid,
                                 f"corpus:batch-a:{site_id}:service:{slug}"))
    return fixture_doc(site_id, "electrician", objects, relationships)


def build_roofer() -> dict:
    """batch-a-roofer: MEDIUM evidence. 6 services, 1 person, 1 location,
    no external identity."""
    site_id = "batch-a-roofer"
    name = "Red Rock Roofing"
    business, bid = business_obj(
        site_id, name,
        "Red Rock Roofing repairs and replaces residential roofs. Call to set up a roof inspection.",
        "970-555-0104", "quotes@redrockroofing.example.com",
        "https://redrockroofing.example.com",
        "4000 Corpus Lane, Palisade, CO 81526",
        "Mo,Tu,We,Th,Fr 07:00-17:00",
        "Palisade, Grand Junction, Fruita, and Clifton",
        extra={"price_range": "$$"},
    )
    location, lid = location_obj(site_id, "Palisade", "Colorado", "81526")
    po, pid = person_obj(site_id, "Gabe Sandoval", "Owner")
    services = [
        ("Roof Repair", "Fixing leaks, missing shingles, and flashing problems."),
        ("Roof Replacement", "Full tear-off and replacement of worn residential roofs."),
        ("Asphalt Shingles", "Architectural shingle installation in common colors."),
        ("Metal Roofing", "Standing seam metal roofs built for snow and hail."),
        ("Gutter Installation", "Seamless gutters and downspouts sized to the roof."),
        ("Storm Damage Assessment", "Documenting hail and wind damage for insurance claims."),
    ]
    objects = [business, location, po]
    relationships = [
        rel(site_id, bid, "located_at", lid,
            f"corpus:batch-a:{site_id}:postal-address"),
        rel(site_id, pid, "works_for", bid,
            f"corpus:batch-a:{site_id}:about-page"),
    ]
    for sname, sdesc in services:
        slug = sname.lower().replace(" ", "-")
        so, sid = service_obj(site_id, sname, sdesc)
        objects.append(so)
        relationships.append(rel(site_id, bid, "offers", sid,
                                 f"corpus:batch-a:{site_id}:service:{slug}"))
    return fixture_doc(site_id, "roofer", objects, relationships)


def fixture_doc(site_id: str, trade: str, objects: list, relationships: list) -> dict:
    return {
        "meta": {
            "site_id": site_id,
            "batch": "batch-a",
            "trade": trade,
            "marker": "DEMO_SYNTHETIC",
            "demo_synthetic": True,
            "format": "fyd-object-graph",
            "format_version": 1,
            "schema_authority": "ObjectGraph (PingObject/PingRelationship), src/fyd/sitespec/types.ts",
            "reference_fixtures": [
                "src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts",
                "src/fyd/proceduralize/__fixtures__/happy-place-graph.ts",
            ],
            "redaction": "All business names, people names, street addresses, phones, and emails are fictional placeholders. No real business identity is present.",
            "generator": "F2-CORPUS-A",
            "created_at": TS,
        },
        "graph": {
            "objects": objects,
            "relationships": relationships,
        },
    }


def canonical(doc: dict) -> bytes:
    return json.dumps(doc, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True).encode("utf-8")


def digest(doc: dict) -> str:
    return hashlib.sha256(canonical(doc)).hexdigest()


def main() -> None:
    FIXDIR.mkdir(parents=True, exist_ok=True)
    builders = {
        "batch-a-plumber": build_plumber,
        "batch-a-hvac": build_hvac,
        "batch-a-electrician": build_electrician,
        "batch-a-roofer": build_roofer,
    }
    for site_id, builder in builders.items():
        doc = builder()
        dg = digest(doc)
        path = FIXDIR / f"{site_id}.json"
        if path.exists():
            existing = json.loads(path.read_text())
            if digest(existing) == dg:
                print(f"SKIP {site_id}: identical digest {dg[:12]}")
                continue
            print(f"REWRITE {site_id}: digest changed")
        else:
            print(f"WRITE {site_id}: digest {dg[:12]}")
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=True) + "\n")


if __name__ == "__main__":
    main()
