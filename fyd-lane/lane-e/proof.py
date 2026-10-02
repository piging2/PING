#!/usr/bin/env python3
"""Lane E proof: one service object across four surfaces.

Ground truth: the PING-backed projection JSON on the Pig.
Digest rule (same as repo canonicalize): recursive key sort,
separators (',',':'), sha256 hex.

D_FACT = sha256(canon({id, name, description, evidenceRef}))
Per surface, extract the fields the surface carries and compare against
the ground-truth digest restricted to the same field subset.

Usage: proof.py <phase>   (phase = baseline | probe | revert)
Writes evidence JSON to ./lane-e/evidence-<phase>.json and prints scorecard rows.
"""
import hashlib
import json
import os
import re
import sys
import urllib.request

BASE = os.environ.get("LANE_E_BASE", "http://127.0.0.1:3100")
PROJECTION = os.environ.get(
    "LANE_E_PROJECTION", "/home/nolan/ping/var/fyd-projections/happy-place.json")
OUT_DIR = os.environ.get("LANE_E_OUT", ".")
SERVICE_ID = "website-service-51de038c1defe8bd"
SITE = "happy-place"


def canon(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(obj):
    return hashlib.sha256(canon(obj).encode("utf-8")).hexdigest()


def get(path, timeout=60):
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return r.status, r.read().decode("utf-8")


def post(path, body, timeout=90):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")


def main(argv):
    phase = argv[1] if len(argv) > 1 else "baseline"

    # ---- ground truth from the projection (local file on the machine that
    # ---- hosts the dev server)
    with open(PROJECTION, encoding="utf-8") as f:
        proj = json.load(f)
    svc = next(o for o in proj["graph"]["objects"] if o["id"] == SERVICE_ID)
    gt = {
        "id": svc["id"],
        "name": svc["title"],
        "description": svc.get("description") or "",
        "evidenceRef": (svc.get("provenance") or {}).get("ref") or "",
    }
    d_fact = digest(gt)
    evidence = {"phase": phase, "serviceId": SERVICE_ID, "groundTruth": gt,
                "d_fact": d_fact, "meta": {k: proj["meta"].get(k) for k in
                ("siteId", "dumperVersion", "graphDigest", "overlayEventIds")},
                "surfaces": {}}
    rows = []

    def check(label, observed_fields, subset_keys):
        want = {k: gt[k] for k in subset_keys}
        got = {k: observed_fields.get(k) for k in subset_keys}
        match = all(got[k] == want[k] for k in subset_keys)
        d = digest({k: observed_fields.get(k) for k in subset_keys})
        d_want = digest(want)
        ok = match and d == d_want
        evidence["surfaces"][label] = {"observed": observed_fields,
                                       "subset": subset_keys,
                                       "digest": d, "wantDigest": d_want,
                                       "pass": ok}
        rows.append((label, ok, d[:16]))
        return ok

    # ---- (a) generated page
    st, html = get("/sites/happy-place")
    page_obs = {
        "id": SERVICE_ID if SERVICE_ID in html else None,
        "name": gt["name"] if gt["name"] in html else None,
        "description": gt["description"] if gt["description"] in html else None,
    }
    page_ok = st == 200 and check("page", page_obs, ["id", "name", "description"])
    evidence["surfaces"]["page"]["httpStatus"] = st
    evidence["surfaces"]["page"]["occurrences"] = {
        "id": html.count(SERVICE_ID), "name": html.count(gt["name"]),
        "description": html.count(gt["description"]) if gt["description"] else 0}

    # ---- (b) circle projection
    st, body = get("/api/fyd/circle?id=" + SITE)
    circ = json.loads(body)
    proj_c = circ.get("projection", {})
    topfacts = proj_c.get("topFacts", []) or []
    circ_obs = {"name": gt["name"] if gt["name"] in topfacts else None}
    circ_ok = st == 200 and circ.get("ok") and check("circle", circ_obs, ["name"])
    # object id is NOT carried by the public-safe circle projection (by design)
    evidence["surfaces"]["circle"]["httpStatus"] = st
    evidence["surfaces"]["circle"]["objectIdPresent"] = SERVICE_ID in body
    evidence["surfaces"]["circle"]["topFacts"] = topfacts

    # ---- (c) ObjectView API
    st, body = get("/api/fyd/objects/" + SITE)
    ov = json.loads(body)
    entry = next((s for s in (ov.get("view", {}).get("services", []) or [])
                  if s.get("id") == SERVICE_ID), None)
    ov_obs = {"id": entry.get("id") if entry else None,
              "name": entry.get("name") if entry else None}
    ov_ok = st == 200 and check("objectview", ov_obs, ["id", "name"])
    evidence["surfaces"]["objectview"]["httpStatus"] = st
    evidence["surfaces"]["objectview"]["entry"] = entry

    # ---- (d) Ask FYD
    st, body = post("/api/fyd/ask", {"siteId": SITE,
        "question": "What services does this business offer and how do you know?"})
    ask = json.loads(body)
    cits = ask.get("citations", []) or []
    cit = next((c for c in cits if c.get("id") == SERVICE_ID), None)
    ask_name = None
    if cit:
        m = re.match(r"^service:\s*(.+)$", cit.get("label", ""))
        ask_name = m.group(1) if m else None
    ask_obs = {"id": cit.get("id") if cit else None, "name": ask_name,
               "nameInAnswer": gt["name"] in (ask.get("answer") or "")}
    ask_ok = st == 200 and ask.get("ok") and not ask.get("refusal") and \
        check("ask", ask_obs, ["id", "name"]) and ask_obs["nameInAnswer"]
    evidence["surfaces"]["ask"]["httpStatus"] = st
    evidence["surfaces"]["ask"]["answer"] = (ask.get("answer") or "")[:300]
    evidence["surfaces"]["ask"]["citation"] = cit

    fact_match = all(evidence["surfaces"][s]["pass"] for s in
                     ("page", "circle", "objectview", "ask"))
    evidence["factualDigestMatch"] = fact_match

    out = os.path.join(OUT_DIR, "evidence-%s.json" % phase)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(evidence, f, indent=2, ensure_ascii=False)

    print("phase=%s service=%s" % (phase, SERVICE_ID))
    print("D_FACT=%s" % d_fact)
    print("graphDigest=%s" % evidence["meta"]["graphDigest"])
    print("overlayEventIds=%s" % json.dumps(evidence["meta"]["overlayEventIds"]))
    for label, ok, d16 in rows:
        print("surface %-10s %s digest=%s..." % (label, "PASS" if ok else "FAIL", d16))
    print("FACTUAL DIGEST MATCH: %s" % ("PASS" if fact_match else "FAIL"))
    print("evidence -> %s" % out)
    return 0 if fact_match else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
