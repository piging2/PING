#!/usr/bin/env python3
"""Tests for mission-control/proposal_validate.py (P0 W4).

Covers: the known-bad original agent patch (must FAIL anchor, contract,
references, and claims), a fully valid revision (must PASS), and unit
cases per check. Hermetic: no network, no live state.
Exit 0 = all green, 1 = any divergence.
"""

import json
import os
import sys

FAILURES = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), name, detail)
    if not cond:
        FAILURES.append(name)


THIS = os.path.dirname(os.path.abspath(__file__))
MC = os.path.normpath(os.path.join(THIS, ".."))
if MC not in sys.path:
    sys.path.insert(0, MC)

from proposal_validate import validate_proposal  # noqa: E402

REPAIRS_ID = "website-business-6fa5ebd99d72c4cb-service-3263502c8175"

# The agent's original proposed_patch from mc-m-c5b2c89b4ff7/result.json,
# copied verbatim (no normalization).
ORIGINAL_PATCH = {
    "heading": "Emergency Services",
    "copy": "We understand that emergencies can cause immediate distress. "
            "Our team is available for emergency repairs 24/7, ensuring "
            "your property stays safe and secure during any natural "
            "disaster or other emergency situation.",
    "featuredIds": ["Emergency Repairs"],
    "hidden": False,
    "objectOrder": 5,
    "hiddenObjectIds": [],
}

VALID_REVISION = {
    "mission_id": "mc-m-c5b2c89b4ff7",
    "page_slug": "home",
    "section_id": "home:Services:2",
    "presentation": {
        "heading": "Emergency Services",
        "copy": "Have an urgent repair? Tell us what is happening and we "
                "will get back to you as quickly as we can.",
        "featuredIds": [REPAIRS_ID],
        "hidden": False,
        "objectOrder": [REPAIRS_ID],
        "hiddenObjectIds": [],
    },
}


def verdict(report, check_id):
    for c in report["checks"]:
        if c["id"] == check_id:
            return c["verdict"]
    return "MISSING"


# ---- the original proposal must FAIL every substantive check ------------
rep = validate_proposal(ORIGINAL_PATCH, mission_id="mc-m-c5b2c89b4ff7")
check("original: overall FAIL", rep["overall"] == "FAIL", rep["overall"])
check("original: anchor FAIL (no page/section)",
      verdict(rep, "anchor") == "FAIL")
check("original: contract FAIL (objectOrder is integer)",
      verdict(rep, "contract") == "FAIL",
      json.dumps([c for c in rep["checks"]
                  if c["id"] == "contract"][0]["evidence"]["problems"]))
check("original: references FAIL (label, not an object id)",
      verdict(rep, "references") == "FAIL")
check("original: claims FAIL (24/7)",
      verdict(rep, "claims") == "FAIL",
      json.dumps([c for c in rep["checks"]
                  if c["id"] == "claims"][0]["evidence"]["hits"]))

# ---- a valid revision must PASS ------------------------------------------
rep2 = validate_proposal(VALID_REVISION, mission_id="mc-m-c5b2c89b4ff7")
check("valid revision: overall PASS", rep2["overall"] == "PASS",
      json.dumps(rep2["checks"]))
for cid in ("anchor", "envelope", "mission_binding", "contract",
            "references", "claims"):
    check("valid revision: %s PASS" % cid, verdict(rep2, cid) == "PASS")

# ---- unit cases ------------------------------------------------------------
bad_anchor = dict(VALID_REVISION, page_slug="pricing")
check("unknown page FAIL",
      verdict(validate_proposal(bad_anchor), "anchor") == "FAIL")

bad_section = dict(VALID_REVISION, section_id="home:Nope:9")
check("unregistered component FAIL",
      verdict(validate_proposal(bad_section), "anchor") == "FAIL")

bad_shape = dict(VALID_REVISION, section_id="home-Services")
check("malformed section_id FAIL",
      verdict(validate_proposal(bad_shape), "anchor") == "FAIL")

extra_field = dict(VALID_REVISION)
extra_field["presentation"] = dict(VALID_REVISION["presentation"],
                                   objectOrder=5)
check("objectOrder integer FAIL",
      verdict(validate_proposal(extra_field), "contract") == "FAIL")

unknown_field = dict(VALID_REVISION)
unknown_field["presentation"] = dict(VALID_REVISION["presentation"],
                                     color="red")
check("unknown presentation field FAIL",
      verdict(validate_proposal(unknown_field), "contract") == "FAIL")

bad_ref = dict(VALID_REVISION)
bad_ref["presentation"] = dict(VALID_REVISION["presentation"],
                               featuredIds=["Emergency Repairs"])
check("label-as-id FAIL",
      verdict(validate_proposal(bad_ref), "references") == "FAIL")

dupe = dict(VALID_REVISION)
dupe["presentation"] = dict(VALID_REVISION["presentation"],
                            objectOrder=[REPAIRS_ID, REPAIRS_ID])
check("duplicated id FAIL",
      verdict(validate_proposal(dupe), "references") == "FAIL")

claimy = dict(VALID_REVISION)
claimy["presentation"] = dict(VALID_REVISION["presentation"],
                              copy="We are the #1 licensed team, "
                                   "guaranteed 24/7.")
check("claim patterns FAIL",
      verdict(validate_proposal(claimy), "claims") == "FAIL")

wrong_mission = dict(VALID_REVISION, mission_id="mc-m-other")
check("mission binding FAIL",
      verdict(validate_proposal(wrong_mission,
                                mission_id="mc-m-c5b2c89b4ff7"),
              "mission_binding") == "FAIL")

not_dict = validate_proposal(["nope"])
check("non-dict proposal FAIL", not_dict["overall"] == "FAIL")

print()
if FAILURES:
    print("FAILURES:", FAILURES)
    sys.exit(1)
print("ALL GREEN")
