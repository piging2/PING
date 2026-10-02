#!/usr/bin/env python3
"""F2-CORPUS-A validation: each batch-a fixture must parse as JSON and
conform to the discovered ObjectGraph schema, plus redaction invariants.

Checks per fixture:
  - top-level {meta, graph}; meta.marker == "DEMO_SYNTHETIC",
    meta.demo_synthetic is True, meta.site_id matches filename
  - graph.objects / graph.relationships are lists
  - every object has the PingObject keys and valid enums; fields values are
    str or list of str; provenance.kind in the ObjectProvenanceKind union
  - every relationship has the PingRelationship keys, status in
    {active, inactive}, and subject/object resolve to real object ids;
    all ids unique
  - redaction: business phone matches ^970-555-01\\d\\d$; every email ends
    .example.com; every website/url field contains .example.com; business
    fields carry DEMO_SYNTHETIC=true; no claimKind == "website_statement"
    (synthetic content must never pose as a website claim); no
    testimonial/review_count/award keys; no em dash in fixture copy
  - structural expectations: service counts {4,7,12,6}, person counts
    {0,2,3,1}, location counts {1,1,2,1}

On success, writes the corpus manifest
~/workspace/fyd-factory/corpus/manifests/batch-a.json with per-fixture
site_id, fixture_digest (sha256 of canonical JSON), and status.
"""

import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path

CORPUS = Path.home() / "workspace" / "fyd-factory" / "corpus"
FIXDIR = CORPUS / "fixtures" / "batch-a"
MANIFEST = CORPUS / "manifests" / "batch-a.json"

KNOWN_SCHEMAS = {
    "ping.social.business@1",
    "ping.social.location@1",
    "ping.social.person@1",
    "ping.social.service@1",
    "ping.social.external_identity@1",
}
PROV_KINDS = {"canonical-journal", "website-derived", "overlay-authored"}
OBJECT_KEYS = {"id", "schema", "controllerId", "visibility", "title",
               "description", "fields", "createdAt", "updatedAt", "provenance"}
REL_KEYS = {"id", "subject", "predicate", "object", "status", "createdAt",
            "evidenceRef"}
PHONE_RE = re.compile(r"^970-555-01\d\d$")
BANNED_KEY_RE = re.compile(r"testimonial|review_count|rating_count|award", re.I)

EXPECT = {
    "batch-a-plumber": {"services": 4, "people": 0, "locations": 1},
    "batch-a-hvac": {"services": 7, "people": 2, "locations": 1},
    "batch-a-electrician": {"services": 12, "people": 3, "locations": 2},
    "batch-a-roofer": {"services": 6, "people": 1, "locations": 1},
}

errors: list[str] = []


def fail(site: str, msg: str) -> None:
    errors.append(f"[{site}] {msg}")


def walk_strings(node, cb):
    if isinstance(node, str):
        cb(node)
    elif isinstance(node, list):
        for v in node:
            walk_strings(v, cb)
    elif isinstance(node, dict):
        for k, v in node.items():
            cb(k)
            walk_strings(v, cb)


def validate(site_id: str, doc: dict) -> dict:
    site = site_id
    if not isinstance(doc, dict):
        fail(site, "top-level JSON is not an object")
        return {}
    meta = doc.get("meta")
    graph = doc.get("graph")
    if not isinstance(meta, dict) or not isinstance(graph, dict):
        fail(site, "missing meta or graph block")
        return {}
    if meta.get("marker") != "DEMO_SYNTHETIC" or meta.get("demo_synthetic") is not True:
        fail(site, "meta DEMO_SYNTHETIC marker missing or wrong")
    if meta.get("site_id") != site_id:
        fail(site, f"meta.site_id {meta.get('site_id')!r} != filename {site_id!r}")

    objects = graph.get("objects")
    rels = graph.get("relationships")
    if not isinstance(objects, list) or not isinstance(rels, list):
        fail(site, "graph.objects / graph.relationships must be lists")
        return {}

    seen_ids: set[str] = set()
    by_schema: dict[str, int] = {}
    business = None
    for i, o in enumerate(objects):
        tag = f"object[{i}]"
        if not isinstance(o, dict):
            fail(site, f"{tag} not an object")
            continue
        missing = OBJECT_KEYS - set(o.keys())
        if missing:
            fail(site, f"{tag} missing keys {sorted(missing)}")
        if o.get("schema") not in KNOWN_SCHEMAS:
            fail(site, f"{tag} unknown schema {o.get('schema')!r}")
        by_schema[o.get("schema", "?")] = by_schema.get(o.get("schema", "?"), 0) + 1
        if o.get("visibility") not in {"public", "private"}:
            fail(site, f"{tag} bad visibility {o.get('visibility')!r}")
        oid = o.get("id")
        if not oid or oid in seen_ids:
            fail(site, f"{tag} duplicate or empty id {oid!r}")
        seen_ids.add(oid)
        fields = o.get("fields")
        if not isinstance(fields, dict):
            fail(site, f"{tag} fields not a dict")
        else:
            for k, v in fields.items():
                if not isinstance(v, str) and not (
                    isinstance(v, list) and all(isinstance(x, str) for x in v)
                ):
                    fail(site, f"{tag} fields[{k!r}] not str/list[str]")
            if fields.get("claimKind") == "website_statement":
                fail(site, f"{tag} claimKind must not be website_statement (synthetic)")
        prov = o.get("provenance")
        if not isinstance(prov, dict) or prov.get("kind") not in PROV_KINDS:
            fail(site, f"{tag} bad provenance.kind")
        if not isinstance(prov, dict) or not prov.get("ref"):
            fail(site, f"{tag} provenance.ref missing")
        for ts_key in ("createdAt", "updatedAt"):
            try:
                datetime.fromisoformat(str(o.get(ts_key)).replace("Z", "+00:00"))
            except ValueError:
                fail(site, f"{tag} bad {ts_key} {o.get(ts_key)!r}")
        if o.get("schema") == "ping.social.business@1":
            business = o

    for i, r in enumerate(rels):
        tag = f"relationship[{i}]"
        if not isinstance(r, dict):
            fail(site, f"{tag} not an object")
            continue
        missing = REL_KEYS - set(r.keys())
        if missing:
            fail(site, f"{tag} missing keys {sorted(missing)}")
        if r.get("status") not in {"active", "inactive"}:
            fail(site, f"{tag} bad status {r.get('status')!r}")
        rid = r.get("id")
        if not rid or rid in seen_ids:
            fail(site, f"{tag} duplicate or empty id {rid!r}")
        seen_ids.add(rid)
        for end in ("subject", "object"):
            if r.get(end) not in seen_ids:
                fail(site, f"{tag} {end} {r.get(end)!r} does not resolve")
        if not r.get("evidenceRef"):
            fail(site, f"{tag} evidenceRef missing")

    # --- redaction invariants over the whole doc
    def check_str(s: str) -> None:
        if "\u2014" in s:
            fail(site, "em dash found in fixture copy")
    walk_strings(doc, check_str)

    banned: list[str] = []
    walk_strings(doc, lambda s: banned.append(s) if BANNED_KEY_RE.search(s) else None)
    if banned:
        fail(site, f"banned keys/values present: {banned[:3]}")

    if business is None:
        fail(site, "no business object")
    else:
        bf = business.get("fields", {})
        if bf.get("DEMO_SYNTHETIC") != "true":
            fail(site, "business fields missing DEMO_SYNTHETIC=true")
        if not PHONE_RE.match(str(bf.get("phone", ""))):
            fail(site, f"business phone {bf.get('phone')!r} not 970-555-01xx")
        email = str(bf.get("email", ""))
        if not re.match(r"^[^@\s]+@[^@\s]+\.example\.com$", email):
            fail(site, f"business email {email!r} not .example.com")
        for key in ("website", "booking_url", "contact_form_url"):
            if key in bf and ".example.com" not in str(bf[key]):
                fail(site, f"business {key} not .example.com")
    for o in objects:
        if o.get("schema") == "ping.social.external_identity@1":
            url = str(o.get("fields", {}).get("url", ""))
            if ".example.com" not in url:
                fail(site, f"external identity url {url!r} not .example.com")

    # --- structural expectations
    exp = EXPECT[site_id]
    got = {
        "services": by_schema.get("ping.social.service@1", 0),
        "people": by_schema.get("ping.social.person@1", 0),
        "locations": by_schema.get("ping.social.location@1", 0),
    }
    if got != exp:
        fail(site, f"structure {got} != expected {exp}")

    return {
        "object_count": len(objects),
        "relationship_count": len(rels),
        "service_count": got["services"],
        "person_count": got["people"],
        "location_count": got["locations"],
    }


def canonical(doc: dict) -> bytes:
    return json.dumps(doc, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True).encode()


def main() -> int:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    entries = []
    for site_id in sorted(EXPECT):
        path = FIXDIR / f"{site_id}.json"
        if not path.exists():
            fail(site_id, f"fixture file missing: {path}")
            continue
        try:
            doc = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            fail(site_id, f"JSON parse error: {e}")
            continue
        counts = validate(site_id, doc)
        dg = hashlib.sha256(canonical(doc)).hexdigest()
        entries.append({
            "site_id": site_id,
            "path": f"fixtures/batch-a/{site_id}.json",
            "fixture_digest": dg,
            "status": "valid" if not any(e.startswith(f"[{site_id}]") for e in errors) else "invalid",
            **counts,
        })
    overall_ok = not errors
    manifest = {
        "batch": "batch-a",
        "generator": "F2-CORPUS-A",
        "created_at": "2026-09-23T00:00:00Z",
        "marker": "DEMO_SYNTHETIC",
        "redaction": "All fixture content is synthetic. No real business identity.",
        "schema_authority": "ObjectGraph (PingObject/PingRelationship), src/fyd/sitespec/types.ts",
        "fixtures": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  " + e)
        return 1
    print("VALIDATION PASSED for all 4 fixtures.")
    for e in entries:
        print(f"  {e['site_id']}: digest {e['fixture_digest'][:12]} "
              f"objects={e['object_count']} rels={e['relationship_count']} "
              f"services={e['service_count']} people={e['person_count']} "
              f"locations={e['location_count']} status={e['status']}")
    print(f"manifest: {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
