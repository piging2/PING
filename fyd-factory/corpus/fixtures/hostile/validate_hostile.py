#!/usr/bin/env python3
"""Validator for SYNTH-HOSTILE fixtures. TESTING ONLY fixtures; reports rejects."""
import json, os, re, sys

D = os.path.expanduser("~/workspace/fyd-factory/corpus/fixtures/hostile")
PHONE_RE = re.compile(r'\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}')
TEST_PHONE = re.compile(r'555-01\d\d')
HEBR = re.compile(r'[\u0590-\u05FF]')
ARAB = re.compile(r'[\u0600-\u06FF]')

def walk_strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from walk_strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk_strings(v)

def biz(doc):
    for o in doc["graph"]["objects"]:
        if o["schema"] == "ping.social.business@1":
            return o
    return None

rejected = []
passed = []

for fn in sorted(f for f in os.listdir(D) if f.endswith(".json")):
    path = os.path.join(D, fn)
    errs = []
    try:
        doc = json.load(open(path))
    except Exception as e:
        errs.append(f"json-load-fail: {e}")
        rejected.append((fn, errs)); continue

    for k in ("synthetic", "synthetic_marker", "testing_only"):
        if k not in doc:
            errs.append(f"missing-testing-marker: {k}")
    if doc.get("synthetic") is not True:
        errs.append("synthetic-not-true")
    if doc.get("synthetic_marker") != "TESTING_ONLY_SYNTHETIC":
        errs.append("bad-synthetic-marker")
    for k in ("variation_thesis", "expected_failure_mode", "hostile_properties"):
        if not doc.get(k):
            errs.append(f"missing-{k}")

    objs = doc.get("graph", {}).get("objects", [])
    rels = doc.get("graph", {}).get("relationships", [])
    ids = set()
    for o in objs:
        for k in ("id", "schema", "controllerId", "visibility", "title", "fields", "provenance"):
            if k not in o:
                errs.append(f"obj-{o.get('id','?')}-missing-{k}")
        ids.add(o.get("id"))
        prov = o.get("provenance") or {}
        if prov.get("kind") != "synthetic":
            errs.append(f"obj-{o.get('id')}-provenance-not-synthetic")
    for r in rels:
        for k in ("id", "subject", "predicate", "object", "status"):
            if k not in r:
                errs.append(f"rel-{r.get('id','?')}-missing-{k}")
        if r.get("subject") not in ids:
            errs.append(f"rel-{r.get('id')}-dangling-subject")
        if r.get("object") not in ids:
            errs.append(f"rel-{r.get('id')}-dangling-object")

    b = biz(doc)
    if not b:
        errs.append("no-business-object")
    else:
        conf = b["fields"].get("conflicts", [])
        if not conf:
            errs.append("business-has-no-explicit-conflicts")
        td = (b.get("title", "") + " " + b.get("description", "")).lower()
        if "test" not in td and "synthetic" not in td:
            errs.append("business-name-not-clearly-synthetic")

    # phone hygiene: any phone-shaped string must be a 555-01XX test number
    for s in walk_strings(doc):
        for m in PHONE_RE.findall(s):
            if not TEST_PHONE.search(m.replace(" ", "-")):
                errs.append(f"real-looking-phone: {m}")

    f = b["fields"] if b else {}
    sid = doc.get("site_id", "")
    body = json.dumps(doc, ensure_ascii=False)
    if sid.startswith("hostile-nojsonld"):
        if f.get("structured_data_present") is not False or f.get("jsonld_source_count") != 0:
            errs.append("nojsonld-flag-missing")
    if sid.startswith("hostile-hoursconf"):
        if not re.search(r"sa(turday)?\b.*(9.*5|09:00-17:00).*closed|closed.*sa(turday)?", body, re.I):
            errs.append("hoursconf-text-missing")
    if sid.startswith("hostile-svc100"):
        n = sum(1 for o in objs if o["schema"] == "ping.social.service@1")
        if n != 100:
            errs.append(f"svc100-count={n}-not-100")
    if sid.startswith("hostile-unsafeurl"):
        for scheme in ("javascript:", "data:text", "vbscript:"):
            if scheme not in body:
                errs.append(f"unsafe-scheme-missing:{scheme}")
    if sid.startswith("hostile-rtl"):
        if not (HEBR.search(body) or ARAB.search(body)):
            errs.append("rtl-chars-missing")
    if sid.startswith("hostile-franchise"):
        if f.get("location_count_in_data") != 3:
            errs.append("franchise-location-count-missing")
    if sid.startswith("hostile-stale"):
        so = f.get("source_last_observed", "")
        if not so or not so.startswith("2024"):
            errs.append("stale-date-missing")
    if sid.startswith("hostile-phonec"):
        if f.get("phone") == f.get("phone_directory") or not f.get("phone_directory"):
            errs.append("phonec-not-conflicting")
    if sid.startswith("hostile-media"):
        for m in ("404-missing-image.jpg", "actual-document.pdf", "ht!tp"):
            if m not in body:
                errs.append(f"media-marker-missing:{m}")

    if errs:
        rejected.append((fn, errs))
    else:
        passed.append(fn)

print(f"VALIDATED {len(passed)} passed, {len(rejected)} rejected")
for fn, errs in rejected:
    print(f"REJECT {fn}")
    for e in errs:
        print(f"  - {e}")
sys.exit(1 if rejected else 0)
