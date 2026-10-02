#!/usr/bin/env python3
"""Lane E Job 4: fail-honestly verification.

Backs up the projection, then tests MISSING and CORRUPT states against all
four surfaces. A surface PASSES the honesty check when it returns an error
status (4xx/5xx) or an explicit unknown/failure payload AND the body contains
neither the service id nor the service name (no plausible demo content).

Always restores the backup and verifies md5 + one live surface afterwards.
"""
import hashlib
import json
import os
import shutil
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3100"
PROJ = "/home/nolan/ping/var/fyd-projections/happy-place.json"
BAK = "/tmp/lane-e/happy-place.json.bak"
SERVICE_ID = "website-service-51de038c1defe8bd"
SERVICE_NAME = "Pergola Design Consultations"
OUT = "/tmp/lane-e/evidence-failhonest.json"


def fetch(path, method="GET", body=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return -1, "TRANSPORT_ERROR: %r" % e


def probe_surfaces():
    results = {}
    st, body = fetch("/sites/happy-place")
    results["page"] = {"status": st, "len": len(body),
                       "leaksId": SERVICE_ID in body, "leaksName": SERVICE_NAME in body}
    st, body = fetch("/api/fyd/circle?id=happy-place")
    results["circle"] = {"status": st, "body": body[:400],
                         "leaksId": SERVICE_ID in body, "leaksName": SERVICE_NAME in body}
    st, body = fetch("/api/fyd/objects/happy-place")
    results["objectview"] = {"status": st, "body": body[:400],
                             "leaksId": SERVICE_ID in body, "leaksName": SERVICE_NAME in body}
    st, body = fetch("/api/fyd/ask", method="POST",
                     body={"siteId": "happy-place",
                           "question": "What services does this business offer and how do you know?"})
    results["ask"] = {"status": st, "body": body[:400],
                      "leaksId": SERVICE_ID in body, "leaksName": SERVICE_NAME in body}
    for k, v in results.items():
        honest_status = v["status"] in (400, 404, 500)
        no_leak = not v["leaksId"] and not v["leaksName"]
        v["honest"] = honest_status and no_leak
    return results


def md5(p):
    return hashlib.md5(open(p, "rb").read()).hexdigest()


def main():
    shutil.copy2(PROJ, BAK)
    orig_md5 = md5(PROJ)
    evidence = {"originalMd5": orig_md5, "scenarios": {}}
    try:
        # --- scenario 1: missing projection
        os.rename(PROJ, PROJ + ".gone")
        try:
            evidence["scenarios"]["missing"] = probe_surfaces()
        finally:
            os.rename(PROJ + ".gone", PROJ)
        # --- scenario 2: corrupt projection
        with open(PROJ, "w") as f:
            f.write('{"meta": "truncated-garbage{{{')
        evidence["scenarios"]["corrupt"] = probe_surfaces()
    finally:
        shutil.copy2(BAK, PROJ)
    restored_md5 = md5(PROJ)
    evidence["restoredMd5"] = restored_md5
    evidence["restoreOk"] = restored_md5 == orig_md5
    # confirm live recovery
    st, body = fetch("/api/fyd/objects/happy-place")
    evidence["recoveryCheck"] = {"status": st, "hasService": SERVICE_ID in body}
    with open(OUT, "w") as f:
        json.dump(evidence, f, indent=2)
    print(json.dumps(evidence, indent=2))
    all_honest = all(v["honest"] for sc in evidence["scenarios"].values() for v in sc.values())
    print("FAIL-HONESTLY: %s | restoreOk=%s recovery=%s" %
          ("PASS" if all_honest and evidence["restoreOk"] else "FAIL",
           evidence["restoreOk"], evidence["recoveryCheck"]))
    return 0 if (all_honest and evidence["restoreOk"]) else 1


if __name__ == "__main__":
    sys.exit(main())
