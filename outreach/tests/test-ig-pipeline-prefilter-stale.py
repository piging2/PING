#!/usr/bin/env python3
"""test-ig-pipeline-prefilter-stale.py — stale re-verification, expensive-call
ordering, per-population metrics, and the guard-index-unavailable fail-closed
rule.

Scenario A (stale re-verification): the latest queue holds three stale
entries (engaged @365roofing, fuzzy-suppressed @365roofin, fresh
@zzzwirestale1). The cheap pre-filter must keep the first two out of
vet_handle; only the fresh stale entry may spend an API call.

Scenario B (ordering): every candidate is filtered, so NOTHING is vetted.
get_account_id, get_following_set, and vet_handle must see zero calls:
the free pre-filter runs before any instagram-cli call.

Scenario C (fail-closed): with the guard's never-re-engage index
unreadable, undecided handles are INELIGIBLE, never ELIGIBLE.
"""
import json
import os
import sys
import tempfile
import types
from datetime import datetime, timedelta, timezone

import importlib.util

# Portable: resolve the outreach package from this test's own location so a
# clean-worktree replay tests the checked-out tree, not the dirty root.
OUTREACH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location(
    "ig_pipeline", os.path.join(OUTREACH, "ig-pipeline.py"))
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


def stale_entry(handle):
    old = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    return {"handle": handle, "rank_score": 1,
            "evidence": {"source": "seed-pool", "vetted_at": old}}


def run_build(existing_entries, sources):
    tmp = tempfile.mkdtemp()
    P.PASSES = tmp
    P.throttle_active = lambda: False
    if existing_entries:
        q = {"entries": existing_entries, "skipped": []}
        with open(os.path.join(tmp, "ig-qualified-queue-old.json"), "w") as f:
            json.dump(q, f)
    calls = {"acct": 0, "following": 0, "vet": []}

    def fake_vet(acct_id, handle, source, following_set=frozenset()):
        calls["vet"].append(handle)
        return ({"handle": handle, "rank_score": 1,
                 "evidence": {"source": source}}, None, "ELIGIBLE")

    def fake_acct():
        calls["acct"] += 1
        return "acct1"

    def fake_following(acct):
        calls["following"] += 1
        return set()

    P.get_account_id = fake_acct
    P.get_following_set = fake_following
    P.vet_handle = fake_vet
    P.parse_sources = lambda: dict(sources)
    P.MAX_CALLS = 300
    args = types.SimpleNamespace(build=True, reverify_only=False,
                                 max_calls=300, queue_depth=80)
    P._build(args, "test-ts")
    queues = [f for f in os.listdir(tmp)
              if f.startswith("ig-qualified-queue-test-ts")]
    q = json.load(open(os.path.join(tmp, queues[0])))
    return calls, q


# ---------------- Scenario A: stale re-verification ----------------
existing = [stale_entry("@365roofing"), stale_entry("@365roofin"),
            stale_entry("@zzzwirestale1")]
calls, q = run_build(existing, {})
vetted = [h.lstrip("@").lower() for h in calls["vet"]]
check("stale engaged handle never re-vetted", "365roofing" not in vetted,
      str(calls["vet"]))
check("stale suppressed handle never re-vetted", "365roofin" not in vetted,
      str(calls["vet"]))
check("fresh stale handle re-vetted", vetted == ["zzzwirestale1"],
      str(calls["vet"]))
check("expensive calls happened (something needed vetting)",
      calls["acct"] == 1 and calls["following"] == 1, str(calls))
skipped = {s["handle"]: s["reason"] for s in q["skipped"]}
check("stale filtered identities visible in skipped",
      "@365roofing" in skipped and "@365roofin" in skipped, str(skipped))
check("stale skipped reasons name the stage",
      "ALREADY_ENGAGED" in skipped["@365roofing"]
      and "SUPPRESSED" in skipped["@365roofin"], str(skipped))
rpm = q["prefilter_metrics"]["reverify_candidates"]
check("reverify metric stages present",
      all(k in rpm for k in ("INPUT", "ALREADY_ENGAGED", "SUPPRESSED",
                             "INELIGIBLE", "VETTED", "ACCEPTED")), str(rpm))
check("reverify per-population metrics",
      rpm["ALREADY_ENGAGED"] == 1 and rpm["SUPPRESSED"] == 1
      and rpm["VETTED"] == 1 and rpm["ACCEPTED"] == 1, str(rpm))
npm = q["prefilter_metrics"]["new_candidates"]
check("new-candidate population untouched by reverify vetting",
      npm["VETTED"] == 0 and npm["ACCEPTED"] == 0, str(npm))

# ---------------- Scenario B: ordering — everything filtered ----------------
calls, q = run_build([], {"@365roofing": "seed-pool",
                           "@365roofin": "seed-pool",
                           "@": "seed-pool"})
check("no account-id call when all filtered", calls["acct"] == 0, str(calls))
check("no following-set call when all filtered", calls["following"] == 0,
      str(calls))
check("no vet calls when all filtered", calls["vet"] == [],
      str(calls["vet"]))
npm = q["prefilter_metrics"]["new_candidates"]
check("all-filtered metrics consistent",
      npm["ALREADY_ENGAGED"] == 1 and npm["SUPPRESSED"] == 1
      and npm["INELIGIBLE"] == 1 and npm["VETTED"] == 0
      and npm["ACCEPTED"] == 0, str(npm))

# ---------------- Scenario C: fail-closed on unreadable guard index ----------------
sys.path.insert(0, OUTREACH)
import ig_prefilter as pf

g = pf._guard_mod()
orig_load_index = g.load_index


def broken_index():
    raise OSError("simulated unreadable guard index")


g.load_index = broken_index
try:
    res = pf.prefilter([("@zzzfailsafe1", "seed-pool"),
                        ("@zzzfailsafe2", "seed-pool")])
finally:
    g.load_index = orig_load_index
m = res["metrics"]
dec = {d["handle"]: d for d in res["decisions"]}
check("fail-closed: zero eligible when index unreadable",
      res["eligible"] == [], str(res["eligible"]))
check("fail-closed: undecided handles INELIGIBLE",
      m["INELIGIBLE"] == 2 and m["ELIGIBLE_FOR_VETTING"] == 0, str(m))
check("fail-closed: reason says failing closed",
      all("failing closed" in dec[h]["reason"]
          for h in ("@zzzfailsafe1", "@zzzfailsafe2")), str(dec))
check("fail-closed: note records the unreadable index",
      any("guard_index_unreadable" in n or "guard_check_unavailable" in n
          for n in m["notes"]), str(m["notes"]))

print("---")
print("pass=%d fail=%d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
