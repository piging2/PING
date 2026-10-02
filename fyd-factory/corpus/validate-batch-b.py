#!/usr/bin/env python3
"""F2-CORPUS-B: validate batch-b fixtures + manifest.

Scope: batch-b envelope fixtures only:
  fixtures/batch-b-*.json and fixtures/batch-b/*.json
(Legacy flat fixtures such as clearwater-plumbing-demo.json use an older
envelope and are out of scope for this batch validator.)

Checks: JSON parses, envelope shape, PingObject/PingRelationship conformance,
schema vocab, relationship referential integrity, scalar fields, no em/en
dashes, phone uniqueness (across all batch-b fixtures) and 0120-0139 range,
.example.com emails/sites, DEMO_SYNTHETIC marker, manifest digest agreement.

Exit 0 on success, 1 with a report otherwise.
Run: python3 validate-batch-b.py
"""
import glob
import hashlib
import json
import os
import re
import sys

CORPUS = os.path.dirname(os.path.abspath(__file__))
FIX_DIR = os.path.join(CORPUS, "fixtures")
MANIFEST_PATH = os.path.join(CORPUS, "manifests", "batch-b.json")
MARKER = "DEMO_SYNTHETIC"

ALLOWED_SCHEMAS = {
    "ping.social.business@1", "ping.social.service@1", "ping.social.location@1",
    "ping.social.person@1", "ping.social.external_identity@1",
    "ping.social.post@1", "ping.social.article@1",
}
ALLOWED_PREDICATES = {"offers", "provides", "located_at", "works_for", "links_to", "publishes"}
OBJ_KEYS = {"id", "schema", "controllerId", "visibility", "title", "description",
            "fields", "createdAt", "updatedAt", "provenance"}
REL_KEYS = {"id", "subject", "predicate", "object", "status", "createdAt", "evidenceRef"}
PHONE_RE = re.compile(r"\(970\) 555-0(\d{3})")

errors = []


def fail(msg):
    errors.append(msg)


def check(cond, msg):
    if not cond:
        fail(msg)


def strings_of(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from strings_of(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings_of(v)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        fail("%s: unreadable JSON: %s" % (path, e))
        return None


def validate_fixture(path, fixture):
    name = os.path.basename(path)
    check(fixture.get("redacted") is True, "%s: redacted must be true" % name)
    check(fixture.get("synthetic_marker") == MARKER, "%s: missing DEMO_SYNTHETIC" % name)
    sid = fixture.get("site_id")
    check(isinstance(sid, str) and sid.startswith("f2b-"), "%s: bad site_id %r" % (name, sid))
    g = fixture.get("graph")
    check(isinstance(g, dict), "%s: missing graph" % name)
    if not isinstance(g, dict):
        return
    objs = g.get("objects", [])
    rels = g.get("relationships", [])
    check(isinstance(objs, list) and objs, "%s: objects empty" % name)
    check(isinstance(rels, list) and rels, "%s: relationships empty" % name)

    oids = set()
    for o in objs:
        missing = OBJ_KEYS - set(o.keys())
        check(not missing, "%s: object %r missing keys %s" % (name, o.get("id"), missing))
        oid = o.get("id")
        check(oid not in oids, "%s: duplicate object id %r" % (name, oid))
        oids.add(oid)
        check(o.get("schema") in ALLOWED_SCHEMAS, "%s: bad schema %r" % (name, o.get("schema")))
        check(o.get("visibility") in ("public", "private"), "%s: bad visibility" % name)
        flds = o.get("fields")
        check(isinstance(flds, dict), "%s: %s fields not a dict" % (name, oid))
        if isinstance(flds, dict):
            for k, v in flds.items():
                ok = isinstance(v, str) or (
                    isinstance(v, list) and all(isinstance(x, str) for x in v))
                check(ok, "%s: %s field %r not scalar/array-of-string" % (name, oid, k))
            check(flds.get("claimKind") == "synthetic_statement",
                  "%s: %s missing synthetic claimKind" % (name, oid))
        prov = o.get("provenance", {})
        check(prov.get("kind") == "synthetic", "%s: %s provenance kind" % (name, oid))
        check("fixture:synthetic" in str(prov.get("ref", "")),
              "%s: %s provenance ref" % (name, oid))

    rids = set()
    for r in rels:
        missing = REL_KEYS - set(r.keys())
        check(not missing, "%s: rel %r missing keys %s" % (name, r.get("id"), missing))
        rid = r.get("id")
        check(rid not in rids, "%s: duplicate rel id %r" % (name, rid))
        rids.add(rid)
        check(r.get("predicate") in ALLOWED_PREDICATES, "%s: bad predicate %r" % (name, r.get("predicate")))
        check(r.get("subject") in oids, "%s: rel %r dangling subject" % (name, rid))
        check(r.get("object") in oids, "%s: rel %r dangling object" % (name, rid))
        check(r.get("status") in ("active", "inactive"), "%s: bad status" % name)

    # no em dashes anywhere in copy
    for s in strings_of(fixture):
        if "\u2014" in s or "\u2013" in s:
            fail("%s: em/en dash found in copy: %r" % (name, s[:60]))
            break

    # phones: range-check every phone field; uniqueness is enforced on the
    # business object's canonical phone (external listings legitimately
    # repeat it, and conflict fixtures may carry rival phone claims).
    phones = []
    for o in objs:
        p = o.get("fields", {}).get("phone")
        if p:
            m = PHONE_RE.fullmatch(p)
            check(bool(m), "%s: phone %r not in (970) 555-0xxx range" % (name, p))
            if m:
                n = int(m.group(1))
                check(120 <= n <= 139, "%s: phone %r outside 0120-0139" % (name, p))
            if o.get("schema") == "ping.social.business@1":
                phones.append(p)
    check(len(phones) >= 1, "%s: business phone missing" % name)
    return phones


def main():
    paths = sorted(glob.glob(os.path.join(FIX_DIR, "batch-b-*.json")) +
                   glob.glob(os.path.join(FIX_DIR, "batch-b", "*.json")))
    check(paths, "no batch-b fixture files found in %s" % FIX_DIR)
    all_phones = {}
    fixtures = {}
    for p in paths:
        f = load(p)
        if f is None:
            continue
        fixtures[os.path.basename(p)] = f
        for ph in validate_fixture(p, f) or []:
            if ph in all_phones:
                fail("duplicate phone %s in %s and %s" % (ph, all_phones[ph], os.path.basename(p)))
            all_phones[ph] = os.path.basename(p)

    m = load(MANIFEST_PATH)
    if m is not None:
        entries = m.get("fixtures", [])
        check(m.get("batch") == "b", "manifest batch != b")
        for e in entries:
            relp = e.get("fixture_path")
            full = os.path.join(CORPUS, relp) if relp else None
            check(full and os.path.exists(full), "manifest entry missing file: %s" % relp)
            if full and os.path.exists(full):
                want = e.get("fixture_digest")
                got = "sha256:" + sha256_file(full)
                check(want == got, "digest mismatch for %s" % relp)
            check(e.get("status") == "ready", "entry %s status not ready" % e.get("site_id"))
            check(e.get("site_id", "").startswith("f2b-"), "bad site_id %r" % e.get("site_id"))
        files = {os.path.basename(p) for p in paths}
        for e in entries:
            rp = e.get("fixture_path", "")
            check(os.path.basename(rp) in files, "manifest entry without fixture: %s" % rp)

    if errors:
        print("VALIDATION FAILED (%d):" % len(errors))
        for e in errors:
            print("  - " + e)
        return 1
    print("VALIDATION PASSED: %d fixtures, %d unique phones, manifest digests agree"
          % (len(fixtures), len(all_phones)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
