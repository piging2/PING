#!/usr/bin/env python3
"""
validate-batch-d.py - Validate F2-CORPUS-D fixtures against the schema contract
harvested from src/fyd/sitespec/{types,schemas}.ts and __fixtures__/.

Checks:
  S1  JSON parses; top-level objects/relationships arrays; fixture envelope
      with synthetic == DEMO_SYNTHETIC and batch == D.
  S2  Object shape: id unique, schema in registry, controllerId, visibility,
      title, description, fields (str | str[]), createdAt/updatedAt,
      provenance {kind, ref, derivedAt} with kind in the ObjectProvenanceKind
      union from src/lib/ping/types.ts.
  S3  Relationship shape: id unique, subject/object resolve, predicate in the
      registry vocabulary and allowed for the subject's schema, status, dates.
  S4  Phones: every phone-like value matches +197055501(60-79); unique across
      the batch; no overlap with other fixture files on disk.
  S5  Emails and http(s) URLs: .example.com hosts only.
  S6  Media: media_ref values must be synthetic-placeholder:// refs (no
      hotlinked real photos); no real image CDN domains anywhere.
  S7  Redaction: no street-level address keys; no client-logo claims.
  S8  Copy hygiene: no em dashes anywhere.
  V1  D1: >= 50 service objects (stress).
  V2  D2: exactly 1 person, >= 8 articles.
  V3  D3: exactly 2 location objects with differing hours, distinct provenance
      refs, and explicit conflict markers cross-referencing each other.
  V4  D4: exactly 3 services, 0 persons, >= 10 posts each with a media_ref.

On success, fills manifests/batch-d.json validation block deterministically
(pinned timestamps) and prints a summary. Exit 0 on pass, 1 on failure.
Rerun-safe: byte-identical manifest on every run.
"""
import hashlib
import json
import os
import re
import sys

TS = "2026-09-23T18:30:00Z"
BASE = os.path.expanduser("~/workspace/fyd-factory/corpus")
FIX_DIR = os.path.join(BASE, "fixtures", "batch-d")
MAN_PATH = os.path.join(BASE, "manifests", "batch-d.json")

FILES = {
    "fyd-corpus-d1": "d1-it-services-provider.json",
    "fyd-corpus-d2": "d2-marketing-consultant-creator.json",
    "fyd-corpus-d3": "d3-software-company.json",
    "fyd-corpus-d4": "d4-photographer-minimal.json",
}

REGISTRY = {
    "ping.social.business@1", "ping.social.service@1", "ping.social.product@1",
    "ping.social.article@1", "ping.social.post@1", "ping.social.person@1",
    "ping.social.location@1",
}
PROV_KINDS = {"canonical-journal", "website-derived", "overlay-authored"}
SUBJECT_PREDICATES = {
    "ping.social.business@1": {"provides", "publishes", "located_at", "employs", "links_to"},
    "ping.social.service@1": {"provided_by"},
    "ping.social.post@1": {"published_by", "replies_to"},
}

PHONE_RE = re.compile(r"^\+197055501(?:6[0-9]|7[0-9])$")
PHONE_LIKE_RE = re.compile(r"\+?1?\s*\(?970\)?[\s.\-]*555[\s.\-]*01\d\d")
EMAIL_RE = re.compile(r"^[^@\s]+@[\w.\-]+\.[a-z]{2,}$", re.I)
URL_RE = re.compile(r"^https?://([^/\s]+)")
BANNED_ADDR_KEYS = {"street_address", "streetaddress", "postal_code", "postalcode",
                    "zip", "zipcode", "street"}
REAL_CDNS = ("unsplash", "pexels", "shutterstock", "gettyimages", "istockphoto",
             "cloudinary", "imgur", "flickr", "amazonaws", "fbcdn", "cdn.")

errors = []
warnings = []


def fail(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def strings_in(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for v in value:
            yield from strings_in(v)
    elif isinstance(value, dict):
        for v in value.values():
            yield from strings_in(v)


def check_file(fid, fname):
    path = os.path.join(FIX_DIR, fname)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # S1: envelope
    for key in ("objects", "relationships", "fixture"):
        if key not in data:
            fail(f"{fid}: missing top-level key '{key}'")
    env = data.get("fixture", {})
    if env.get("synthetic") != "DEMO_SYNTHETIC":
        fail(f"{fid}: fixture.synthetic != DEMO_SYNTHETIC")
    if env.get("batch") != "D":
        fail(f"{fid}: fixture.batch != D")
    if env.get("id") != fid:
        fail(f"{fid}: fixture.id mismatch")

    objects = data.get("objects", [])
    rels = data.get("relationships", [])
    if not isinstance(objects, list) or not isinstance(rels, list):
        fail(f"{fid}: objects/relationships must be arrays")
        return data, {}, {}

    # S2: objects
    seen_ids = set()
    by_id = {}
    for i, o in enumerate(objects):
        ctx = f"{fid} objects[{i}]"
        for key in ("id", "schema", "controllerId", "visibility", "title",
                    "description", "fields", "createdAt", "updatedAt", "provenance"):
            if key not in o:
                fail(f"{ctx}: missing key '{key}'")
        oid = o.get("id")
        if oid in seen_ids:
            fail(f"{ctx}: duplicate object id '{oid}'")
        seen_ids.add(oid)
        by_id[oid] = o
        if o.get("schema") not in REGISTRY:
            fail(f"{ctx}: unknown schema '{o.get('schema')}'")
        if o.get("visibility") != "public":
            fail(f"{ctx}: visibility must be 'public'")
        fields = o.get("fields", {})
        if not isinstance(fields, dict):
            fail(f"{ctx}: fields must be an object")
        else:
            for k, v in fields.items():
                if not (isinstance(v, str) or
                        (isinstance(v, list) and all(isinstance(x, str) for x in v))):
                    fail(f"{ctx}: field '{k}' must be string or string[]")
        prov = o.get("provenance", {})
        if prov.get("kind") not in PROV_KINDS:
            fail(f"{ctx}: provenance.kind '{prov.get('kind')}' not in union")
        for pk in ("ref", "derivedAt"):
            if not prov.get(pk):
                fail(f"{ctx}: provenance missing '{pk}'")

    # S3: relationships
    seen_rids = set()
    for i, r in enumerate(rels):
        ctx = f"{fid} relationships[{i}]"
        for key in ("id", "subject", "predicate", "object", "status", "createdAt", "evidenceRef"):
            if key not in r:
                fail(f"{ctx}: missing key '{key}'")
        if r.get("id") in seen_rids:
            fail(f"{ctx}: duplicate relationship id '{r.get('id')}'")
        seen_rids.add(r.get("id"))
        subj, pred, objt = r.get("subject"), r.get("predicate"), r.get("object")
        if subj not in by_id:
            fail(f"{ctx}: subject '{subj}' not found")
        if objt not in by_id:
            fail(f"{ctx}: object '{objt}' not found")
        if subj in by_id:
            allowed = SUBJECT_PREDICATES.get(by_id[subj]["schema"])
            if allowed is None:
                fail(f"{ctx}: schema '{by_id[subj]['schema']}' must not be a relationship subject")
            elif pred not in allowed:
                fail(f"{ctx}: predicate '{pred}' not allowed for schema '{by_id[subj]['schema']}'")
        if r.get("status") != "active":
            fail(f"{ctx}: status must be 'active'")
        if not r.get("evidenceRef"):
            fail(f"{ctx}: missing evidenceRef")

    # S4-S8: content hygiene over every string in the file
    for s in strings_in(data):
        if "\u2014" in s:
            fail(f"{fid}: em dash found in {s[:60]!r}")
        if PHONE_LIKE_RE.search(s):
            m = PHONE_LIKE_RE.search(s)
            if not PHONE_RE.match(m.group(0).replace(" ", "").replace("(", "").replace(")", "").replace("-", "").replace(".", "")):
                fail(f"{fid}: phone '{m.group(0)}' outside batch range 0160-0179")
        for em in re.findall(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", s):
            if not em.lower().endswith(".example.com"):
                fail(f"{fid}: non-example email '{em}'")
        um = URL_RE.search(s)
        if um and "example.com" not in um.group(1).lower():
            fail(f"{fid}: non-example URL host '{um.group(1)}' in {s[:60]!r}")
        low = s.lower()
        if low.startswith("synthetic-placeholder://"):
            pass
        elif any(c in low for c in REAL_CDNS):
            fail(f"{fid}: real CDN/photo domain in {s[:60]!r}")
    for o in objects:
        for k in o.get("fields", {}):
            if k.lower().replace("-", "_") in BANNED_ADDR_KEYS:
                fail(f"{fid} {o['id']}: street-level address key '{k}'")
            if "client" in k.lower() and "logo" in k.lower():
                fail(f"{fid} {o['id']}: client logo claim key '{k}'")

    return data, by_id, objects


def schema_counts(objects):
    counts = {}
    for o in objects:
        s = o["schema"].split(".")[-1].split("@")[0]
        counts[s] = counts.get(s, 0) + 1
    return counts


def main():
    if not os.path.isdir(FIX_DIR):
        fail(f"fixture dir missing: {FIX_DIR}")
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    graphs, by_ids, obj_lists = {}, {}, {}
    for fid, fname in FILES.items():
        try:
            data, by_id, objects = check_file(fid, fname)
        except (json.JSONDecodeError, OSError) as e:
            fail(f"{fid}: load error: {e}")
            continue
        graphs[fid] = data
        by_ids[fid] = by_id
        obj_lists[fid] = objects

    # S4 continued: batch-wide phone uniqueness
    phones = {}
    for fid, data in graphs.items():
        for s in strings_in(data):
            for m in PHONE_LIKE_RE.finditer(s):
                canon = re.sub(r"[\s().\-]", "", m.group(0))
                phones.setdefault(canon, []).append(fid)
    for canon, fids in phones.items():
        if len(fids) > 1:
            fail(f"phone {canon} duplicated across {fids}")
    if len(phones) != 4:
        fail(f"expected exactly 4 distinct batch phones, found {len(phones)}: {sorted(phones)}")

    # S4 continued: no overlap with other fixture files on disk
    scan_roots = [
        os.path.expanduser("~/workspace/fyd-factory"),
    ]
    other_hits = {}
    for root in scan_roots:
        for dirpath, _, filenames in os.walk(root):
            if "batch-d" in dirpath:
                continue
            for fn in filenames:
                if not fn.endswith((".json", ".ts", ".md")):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                except OSError:
                    continue
                for m in PHONE_LIKE_RE.finditer(text):
                    canon = re.sub(r"[\s().\-]", "", m.group(0))
                    if canon in phones:
                        other_hits.setdefault(canon, []).append(p)
    for canon, paths in other_hits.items():
        fail(f"batch phone {canon} also appears in: {paths[:3]}")

    # V1-V4: variant checks
    def counts(fid):
        return schema_counts(obj_lists.get(fid, []))

    c1 = counts("fyd-corpus-d1")
    if c1.get("service", 0) < 50:
        fail(f"d1: expected >= 50 services, found {c1.get('service', 0)}")
    c2 = counts("fyd-corpus-d2")
    if c2.get("person", 0) != 1:
        fail(f"d2: expected exactly 1 person, found {c2.get('person', 0)}")
    if c2.get("article", 0) < 8:
        fail(f"d2: expected >= 8 articles, found {c2.get('article', 0)}")
    c3 = counts("fyd-corpus-d3")
    if c3.get("location", 0) != 2:
        fail(f"d3: expected exactly 2 location objects, found {c3.get('location', 0)}")
    else:
        locs = [o for o in obj_lists["fyd-corpus-d3"] if o["schema"] == "ping.social.location@1"]
        hours = [o["fields"].get("hours_claim") for o in locs]
        refs = [o["provenance"]["ref"] for o in locs]
        if hours[0] == hours[1]:
            fail("d3: conflicting hours claims are identical")
        if refs[0] == refs[1]:
            fail("d3: conflicting claims share a provenance ref")
        ids = {o["id"] for o in locs}
        for o in locs:
            if o["fields"].get("conflicting_claim_id") not in ids - {o["id"]}:
                fail(f"d3 {o['id']}: conflicting_claim_id does not cross-reference the other claim")
            if o["fields"].get("hours_conflict") != "true":
                fail(f"d3 {o['id']}: missing hours_conflict marker")
    c4 = counts("fyd-corpus-d4")
    if c4.get("service", 0) != 3:
        fail(f"d4: expected exactly 3 services, found {c4.get('service', 0)}")
    if c4.get("person", 0) != 0:
        fail(f"d4: expected 0 persons, found {c4.get('person', 0)}")
    posts = [o for o in obj_lists.get("fyd-corpus-d4", []) if o["schema"] == "ping.social.post@1"]
    if len(posts) < 10:
        fail(f"d4: expected >= 10 posts, found {len(posts)}")
    for p in posts:
        if not p["fields"].get("media_ref", "").startswith("synthetic-placeholder://"):
            fail(f"d4 {p['id']}: post missing synthetic-placeholder media_ref")

    # Update manifest deterministically
    manifest = None
    if os.path.exists(MAN_PATH):
        with open(MAN_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    fixtures_block = []
    for fid, fname in FILES.items():
        path = os.path.join(FIX_DIR, fname)
        with open(path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        data = graphs.get(fid, {})
        fixtures_block.append({
            "id": fid,
            "file": f"fixtures/batch-d/{fname}",
            "variant": data.get("fixture", {}).get("variant", ""),
            "object_counts": schema_counts(obj_lists.get(fid, [])),
            "object_total": len(obj_lists.get(fid, [])),
            "relationship_count": len(data.get("relationships", [])),
            "sha256": digest,
        })
    validation_block = {
        "status": "pass" if not errors else "fail",
        "run_at": TS,
        "validator": "fyd-factory/corpus/tools/validate-batch-d.py",
        "checks": ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "V1", "V2", "V3", "V4"],
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
    }
    manifest = manifest or {}
    manifest.update({
        "batch": "D",
        "corpus": "fyd-factory",
        "generated_at": TS,
        "generator": "fyd-factory/corpus/tools/gen-batch-d.py",
        "synthetic_marker": "DEMO_SYNTHETIC",
        "phone_range": "0160-0179",
        "rerun_safe": True,
        "fixtures": fixtures_block,
        "validation": validation_block,
    })
    with open(MAN_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("VALIDATION:", "PASS" if not errors else "FAIL")
    print(f"errors={len(errors)} warnings={len(warnings)}")
    for e in errors:
        print(" ERROR:", e)
    for w in warnings:
        print(" WARN:", w)
    for fb in fixtures_block:
        print(f" {fb['id']}: objects={fb['object_total']} rels={fb['relationship_count']} sha256={fb['sha256'][:16]}...")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
