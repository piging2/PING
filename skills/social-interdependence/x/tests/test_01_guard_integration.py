#!/usr/bin/env python3
"""Test 1: the REAL engagement-guard.py eligibility_check is the policy
authority. Fixture candidates must be genuinely ELIGIBLE; blocked,
ambiguous, empty, and capability-stripped candidates must fail closed."""
import importlib.util
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T

spec = importlib.util.spec_from_file_location(
    "eg", "/home/hatch/workspace/outreach/engagement-guard.py")
eg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eg)

os.environ["X_SI_OUTREACH_ROOT"] = T.make_outreach_root()
index = eg.load_index()
data = eg.load_eligibility_data()

LIKE_CAND = {"platform": "x", "type": "like",
             "url": "https://x.com/gjroastworks/status/1973500000000000001",
             "page": "gjroastworks",
             "text": "Fresh roast drop: Ethiopian single origin on the bar "
                     "all week in downtown Grand Junction."}
FOLLOW_CAND = {"platform": "x", "type": "follow", "url": "",
               "page": "palisadepeachco", "text": ""}

r = eg.eligibility_check(index, LIKE_CAND, data=data, surface_status="ACTIVE")
T.check("guard: fixture like candidate is ELIGIBLE",
        r["decision"] == "ELIGIBLE", r)

r = eg.eligibility_check(index, FOLLOW_CAND, data=data,
                         surface_status="ACTIVE")
T.check("guard: fixture follow candidate is ELIGIBLE",
        r["decision"] == "ELIGIBLE", r)

blocked = dict(LIKE_CAND, page="western colorado chimney",
               text="western colorado chimney sweep special this week")
r = eg.eligibility_check(index, blocked, data=data, surface_status="ACTIVE")
T.check("guard: blocked business is INELIGIBLE/BLOCKED",
        r["decision"] == "INELIGIBLE" and
        r["primary_reason"] == "BLOCKED", r)

r = eg.eligibility_check(index, {"platform": "x", "type": "like"},
                         data=data, surface_status="ACTIVE")
T.check("guard: empty candidate is UNKNOWN (never dispatched)",
        r["decision"] == "UNKNOWN", r)

data_nolike = eg.load_eligibility_data()
data_nolike["action-capability.json"]["platforms"]["x"] = {"follow": True,
                                                           "comment": True}
r = eg.eligibility_check(index, LIKE_CAND, data=data_nolike,
                         surface_status="ACTIVE")
T.check("guard: stale capability -> CAPABILITY_MISSING",
        r["decision"] == "INELIGIBLE" and
        r["primary_reason"] == "CAPABILITY_MISSING", r)

# Identity ambiguity: a handle closely resembling an engaged handle fails
# closed as BLOCKED (check_x fuzzy rule, threshold 0.9).
handles = index["platforms"]["x"].get("handles", [])
amb = None
for h in handles:
    if len(h) >= 7:
        amb = h + "x"
        break
if amb:
    d, reason = eg.check_x(index, amb)
    T.check("guard: fuzzy handle resemblance fails closed BLOCKED",
            d == "BLOCKED", (amb, d, reason))
else:
    T.check("guard: fuzzy handle resemblance fails closed BLOCKED",
            False, "no engaged handle of length>=7 in fixture index")

# batch_seen duplicate: second identical candidate in one batch is DUPLICATE.
seen = set()
r1 = eg.eligibility_check(index, LIKE_CAND, data=data, surface_status="ACTIVE",
                          batch_seen=seen)
r2 = eg.eligibility_check(index, LIKE_CAND, data=data, surface_status="ACTIVE",
                          batch_seen=seen)
T.check("guard: within-batch duplicate is DUPLICATE",
        r1["decision"] == "ELIGIBLE" and r2["decision"] == "INELIGIBLE"
        and r2["primary_reason"] == "DUPLICATE", (r1["decision"],
                                                 r2["decision"]))

sys.exit(T.summary())
