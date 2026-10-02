#!/usr/bin/env python3
"""test-ig-pipeline-prefilter-wire.py — the wired pipeline never spends an
API call on an engaged/suppressed handle.

Mocks the instagram-cli boundary (get_account_id, get_following_set,
vet_handle) and the source parser; runs the real _build(); asserts
vet_handle saw only pre-filter survivors and the queue metrics carry the
INPUT/ALREADY_ENGAGED/SUPPRESSED/INELIGIBLE/VETTED/ACCEPTED stages.
"""
import json
import os
import sys
import tempfile
import types

import importlib.util

# Portable: resolve ig-pipeline.py from this test's own location so a
# clean-worktree replay tests the checked-out tree, not the dirty root.
_OUTREACH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "ig_pipeline",
    os.path.join(_OUTREACH, "ig-pipeline.py"))
P = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P)

PASS = 0
FAIL = 0


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print("ok   %s" % name)
    else:
        FAIL += 1
        print("FAIL %s :: %s" % (name, extra))


tmp = tempfile.mkdtemp()
P.PASSES = tmp
P.throttle_active = lambda: False

vet_calls = []


def fake_vet(acct_id, handle, source, following_set=frozenset()):
    vet_calls.append(handle)
    return ({"handle": handle, "rank_score": 1,
             "evidence": {"source": source}}, None, "ELIGIBLE")


P.get_account_id = lambda: "acct1"
P.get_following_set = lambda acct: set()
P.vet_handle = fake_vet
# engaged handle + fuzzy near-miss + fresh handle + empty
P.parse_sources = lambda: {"@365roofing": "seed-pool",
                           "@365roofin": "seed-pool",
                           "@zzzwirefresh1": "seed-pool",
                           "@": "seed-pool"}

args = types.SimpleNamespace(build=True, reverify_only=False,
                             max_calls=300, queue_depth=80)
P.MAX_CALLS = 300
P._build(args, "test-ts")

vetted = [h.lstrip("@").lower() for h in vet_calls]
check("engaged handle never vetted", "365roofing" not in vetted, str(vet_calls))
check("suppressed handle never vetted", "365roofin" not in vetted, str(vet_calls))
check("fresh handle vetted", vetted == ["zzzwirefresh1"], str(vet_calls))

queues = [f for f in os.listdir(tmp) if f.startswith("ig-qualified-queue-")]
check("one queue written", len(queues) == 1, str(queues))
q = json.load(open(os.path.join(tmp, queues[0])))
pm = q["prefilter_metrics"]["new_candidates"]
check("metric stages present",
      all(k in pm for k in ("INPUT", "ALREADY_ENGAGED", "SUPPRESSED",
                            "INELIGIBLE", "VETTED", "ACCEPTED")), str(pm))
check("metric values", pm["ALREADY_ENGAGED"] == 1 and pm["SUPPRESSED"] == 1
      and pm["INELIGIBLE"] == 1 and pm["VETTED"] == 1 and pm["ACCEPTED"] == 1,
      str(pm))
skipped = {s["handle"]: s["reason"] for s in q["skipped"]}
check("filtered identities visible in queue skipped",
      "@365roofing" in skipped and "@365roofin" in skipped, str(skipped))
check("skipped reasons name the stage",
      "ALREADY_ENGAGED" in skipped["@365roofing"]
      and "SUPPRESSED" in skipped["@365roofin"], str(skipped))

print("---")
print("pass=%d fail=%d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
