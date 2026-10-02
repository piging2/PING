#!/usr/bin/env python3
"""
Lane C proof: owner correction convergence across the four surfaces.

Scenario: the source projection says Happy Place's phone is +15412865190.
The owner says "That's not our main phone number." and corrects it to
+15415550123 (a reserved fictional test number, never a real business fact).

Proves, in order:
  1. BASELINE: Page, Circle, ObjectView, Ask FYD all show the source phone.
  2. Propose + approve an owner correction through the two-stage API.
  3. All four surfaces show the OWNER value.
  4. The source projection file is untouched (raw endpoint still shows X).
  5. Evidence: the correction record keeps SOURCE SAYS X / OWNER SAYS Y,
     the actor label, and its basis; the page shows the honest note; Ask
     classifies the claim as an owner override.
  6. Durability: the owner store file exists on disk (reload retains).
  7. Source re-observation: an honestly re-dumped projection (digest
     recomputed, backup/restore guarded) with a NEW source phone does NOT
     erase the owner value; drift is flagged. Then the backup is restored.
  8. Revert: all four surfaces return to the source value; the history
     keeps both the correction and the revert.

Runs against the private route only: http://100.79.154.43:3100
Usage: proof-owner-correction.py [--keep]   (--keep leaves the correction in place)
Exit 0 on full pass, 1 on any failure, with a step-by-step log.
"""

import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request

BASE = "http://100.79.154.43:3100"
SITE = "happy-place"
SOURCE_PHONE = "+15412865190"
OWNER_PHONE = "+15415550123"  # reserved fictional test number
DRIFT_PHONE = "+19998887777"  # simulated re-observed source value
PROJECTION = "/home/nolan/ping/var/fyd-projections/happy-place.json"
OWNER_STORE = "/home/nolan/projects/ping/data/fyd-owner/happy-place.json"

failures = []


def log(step, msg):
    print(f"[{step}] {msg}", flush=True)


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"  {status}: {name}" + (f" -- {detail}" if detail and not cond else ""), flush=True)
    if not cond:
        failures.append(name)


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as r:
        return r.read().decode("utf-8")


def get_json(path):
    return json.loads(get(path))


def post_json(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def canonicalize(v):
    """Mirror of src/lib/ping/ask-composer.ts canonicalize (verified below)."""
    if v is None:
        return "null"
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return json.dumps(v)
    if isinstance(v, list):
        return "[" + ",".join(canonicalize(x) for x in v) + "]"
    if isinstance(v, dict):
        return (
            "{"
            + ",".join(
                json.dumps(k, ensure_ascii=False) + ":" + canonicalize(v[k])
                for k in sorted(v.keys())
            )
            + "}"
        )
    return "null"


def digest_of(graph):
    return hashlib.sha256(canonicalize(graph).encode("utf-8")).hexdigest()


def business_phone(graph):
    for o in graph["objects"]:
        if "business" in o.get("schema", "") and o.get("visibility") == "public":
            v = o.get("fields", {}).get("phone")
            if isinstance(v, list):
                v = v[0] if v else None
            return v
    return None


def four_surfaces():
    """Read all four surfaces. Returns dict of observed phone-ish values."""
    page = get("/sites/happy-place")
    circle = get_json("/api/fyd/circle?id=happy-place")
    obj = get_json("/api/fyd/objects/happy-place")
    ask = post_json("/api/fyd/ask", {"siteId": SITE, "question": "What is your phone number?"})
    return {"page": page, "circle": circle, "obj": obj, "ask": ask}


def phone_in_circle(circle):
    return json.dumps(circle)


# ---------------------------------------------------------------- 0. digest
log("0", "verifying canonicalize replication against the live projection digest")
proj = json.loads(open(PROJECTION).read())
check(
    "canonicalize replication is exact",
    digest_of(proj["graph"]) == proj["meta"]["graphDigest"],
    "recomputed digest does not match meta.graphDigest",
)
check("live projection says the source phone", business_phone(proj["graph"]) == SOURCE_PHONE)

# ---------------------------------------------------------------- 1. baseline
log("1", "BASELINE: all four surfaces show the source phone " + SOURCE_PHONE)
s = four_surfaces()
check("page shows source phone", SOURCE_PHONE in s["page"])
check("page does not show owner phone", OWNER_PHONE not in s["page"])
check("circle call capability uses source phone", "tel:" + SOURCE_PHONE in phone_in_circle(s["circle"]))
check(
    "object view shows source phone",
    s["obj"]["view"]["contact"]["phone"] == SOURCE_PHONE,
    json.dumps(s["obj"]["view"]["contact"])[:200],
)
check("object view has no corrections", s["obj"]["view"]["fieldCorrections"] == [])
check("ask answers the source phone", SOURCE_PHONE in s["ask"]["answer"], s["ask"]["answer"][:200])
raw = get_json("/api/fyd/projection?siteId=" + SITE)
check("raw projection endpoint shows source phone", business_phone(raw["graph"]) == SOURCE_PHONE)

# ---------------------------------------------------------------- 2. propose
log("2", "owner says: That is not our main phone number. Proposing a correction")
prop = post_json(
    "/api/fyd/objects/" + SITE + "/overrides",
    {"stage": "propose", "text": "correct phone to " + OWNER_PHONE},
)
check("proposal returned", prop.get("ok") is True, json.dumps(prop)[:300])
cmd = (prop.get("proposal") or {}).get("command") or {}
check("proposal is a set-contact-field command", cmd.get("type") == "set-contact-field")
check("proposal targets phone", cmd.get("field") == "phone")
check("proposal carries the owner value", cmd.get("value") == OWNER_PHONE)
# Nothing written at propose time.
s2 = get_json("/api/fyd/objects/" + SITE)
check("propose writes nothing", s2["view"]["contact"]["phone"] == SOURCE_PHONE)

# ---------------------------------------------------------------- 3. approve
log("3", "approving the correction")
appr = post_json(
    "/api/fyd/objects/" + SITE + "/overrides",
    {"stage": "approve", "command": cmd},
)
check("approve ok", appr.get("ok") is True, json.dumps(appr)[:300])

# ---------------------------------------------------------------- 4. convergence
log("4", "all four surfaces show the OWNER value " + OWNER_PHONE)
s = four_surfaces()
check("page shows owner phone", OWNER_PHONE in s["page"])
check("page carries the honest correction note", "Owner-corrected" in s["page"])
check("page note names the source value", SOURCE_PHONE in s["page"])
check("circle call capability uses owner phone", "tel:" + OWNER_PHONE in phone_in_circle(s["circle"]))
check(
    "object view shows owner phone",
    s["obj"]["view"]["contact"]["phone"] == OWNER_PHONE,
    json.dumps(s["obj"]["view"]["contact"])[:200],
)
corr = s["obj"]["view"]["fieldCorrections"]
check("object view exposes one correction", len(corr) == 1, json.dumps(corr)[:300])
if corr:
    c = corr[0]
    check("record keeps SOURCE SAYS X", c["sourceValue"] == SOURCE_PHONE)
    check("record keeps OWNER SAYS Y", c["ownerValue"] == OWNER_PHONE)
    check("record names the demo actor as unverified", "unverified" in c["actorLabel"].lower())
    check("record has a basis", len(c.get("basis", "")) > 0)
    check("no drift before any source change", c.get("sourceDrifted") is False)
check("ask answers the owner phone", OWNER_PHONE in s["ask"]["answer"], s["ask"]["answer"][:300])
check("ask names the source value too", SOURCE_PHONE in s["ask"]["answer"], s["ask"]["answer"][:300])
cites = s["ask"].get("citations", [])
phone_cites = [c for c in cites if str(c.get("id", "")).endswith("#phone")]
check("ask cites the phone correction as field evidence", len(phone_cites) == 1, json.dumps(cites)[:300])
if phone_cites:
    pc = phone_cites[0]
    check("ask citation basis is Owner-set value", pc.get("basis") == "Owner-set value", json.dumps(pc))
    check("ask citation source is the owner correction", pc.get("source") == "Owner correction", json.dumps(pc))

# ---------------------------------------------------------------- 5. source untouched
log("5", "the source projection is untouched by the correction")
raw = get_json("/api/fyd/projection?siteId=" + SITE)
check("raw endpoint still shows the source phone", business_phone(raw["graph"]) == SOURCE_PHONE)
disk = json.loads(open(PROJECTION).read())
check("projection file digest still verifies", digest_of(disk["graph"]) == disk["meta"]["graphDigest"])

# ---------------------------------------------------------------- 6. durability
log("6", "the correction is durable owner state, not generated cache")
import os

check("owner store file exists on disk", os.path.exists(OWNER_STORE), OWNER_STORE)
if os.path.exists(OWNER_STORE):
    store = json.loads(open(OWNER_STORE).read())
    check(
        "store holds the phone correction",
        store.get("fieldCorrections", {}).get("phone", {}).get("ownerValue") == OWNER_PHONE,
    )
    hist = " ".join(h.get("text", "") for h in store.get("history", []))
    check("history log mentions the correction", OWNER_PHONE in hist)
# Fresh reads (new requests re-read the store): still the owner value.
again = get_json("/api/fyd/objects/" + SITE)
check("fresh read retains the correction", again["view"]["contact"]["phone"] == OWNER_PHONE)

# ---------------------------------------------------------------- 7. source re-observation
log("7", "simulating source re-observation: honestly re-dumped projection, new source phone")
backup = PROJECTION + ".lane-c-backup"
shutil.copy2(PROJECTION, backup)
try:
    disk = json.loads(open(PROJECTION).read())
    for o in disk["graph"]["objects"]:
        if "business" in o.get("schema", "") and o.get("visibility") == "public":
            o["fields"]["phone"] = DRIFT_PHONE
    disk["meta"]["graphDigest"] = digest_of(disk["graph"])
    open(PROJECTION, "w").write(json.dumps(disk))
    # Sanity: the seam still verifies (we recomputed honestly).
    verify = json.loads(open(PROJECTION).read())
    assert digest_of(verify["graph"]) == verify["meta"]["graphDigest"]
    drifted = get_json("/api/fyd/objects/" + SITE)
    check(
        "owner value survives source re-observation",
        drifted["view"]["contact"]["phone"] == OWNER_PHONE,
    )
    dc = drifted["view"]["fieldCorrections"]
    check("correction record still present", len(dc) == 1)
    if dc:
        check("drift is flagged, not silent", dc[0].get("sourceDrifted") is True)
        check(
            "record keeps the ORIGINAL source value",
            dc[0]["sourceValue"] == SOURCE_PHONE,
            json.dumps(dc[0])[:200],
        )
    raw2 = get_json("/api/fyd/projection?siteId=" + SITE)
    check("raw endpoint shows the NEW source phone", business_phone(raw2["graph"]) == DRIFT_PHONE)
finally:
    shutil.copy2(backup, PROJECTION)
    log("7", "projection backup restored")
restored = get_json("/api/fyd/objects/" + SITE)
check("after restore, drift flag clears", restored["view"]["fieldCorrections"][0].get("sourceDrifted") is False)
check("after restore, owner value still shown", restored["view"]["contact"]["phone"] == OWNER_PHONE)

# ---------------------------------------------------------------- 8. revert
log("8", "reverting the correction")
if "--keep" in sys.argv:
    log("8", "--keep given: leaving the correction in place, skipping revert")
else:
    rev = post_json(
        "/api/fyd/objects/" + SITE + "/overrides",
        {"stage": "approve", "command": {"type": "revert-contact-field", "field": "phone"}},
    )
    check("revert ok", rev.get("ok") is True, json.dumps(rev)[:200])
    s = four_surfaces()
    check("page shows the source phone again", SOURCE_PHONE in s["page"] and OWNER_PHONE not in s["page"])
    check(
        "circle uses the source phone again",
        "tel:" + SOURCE_PHONE in phone_in_circle(s["circle"]),
    )
    check(
        "object view shows the source phone again",
        s["obj"]["view"]["contact"]["phone"] == SOURCE_PHONE,
    )
    check("corrections list is empty again", s["obj"]["view"]["fieldCorrections"] == [])
    check("ask answers the source phone again", SOURCE_PHONE in s["ask"]["answer"])
    store = json.loads(open(OWNER_STORE).read())
    hist = " ".join(h.get("text", "") for h in store.get("history", []))
    check("history keeps the correction event", OWNER_PHONE in hist)
    check("history records the revert", "evert" in hist)

print()
if failures:
    print(f"RESULT: FAIL ({len(failures)} failing checks)")
    for f in failures:
        print(" - " + f)
    sys.exit(1)
print("RESULT: PASS (all checks green)")
