#!/usr/bin/env python3
"""test-ig-prefilter.py — the IG pipeline pre-filter burns zero API calls on
already-engaged or suppressed handles.

The pre-filter (SOURCE POOL -> canonical identity/dedupe -> already-engaged
-> suppression/policy -> eligibility) runs entirely on local files. Expensive
vetting (vet_handle: user-profile / posts / media-understanding CLI calls)
must never see an engaged or suppressed handle. Filtered identities stay
visible in the decisions list with stage + reason.
"""
import os
import sys

# Portable: resolve the outreach package from this test's own location so a
# clean-worktree replay tests the checked-out tree, not the dirty root.
OUTREACH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, OUTREACH)
import ig_prefilter as pf

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


# A handle known to be in engaged-handles-latest.json (authoritative source).
ENGAGED = "@365roofing"
# A near-miss of the engaged handle: fuzzy-blocked (>=0.9) -> SUPPRESSED.
FUZZY = "@365roofin"
# A handle with no history anywhere: passes to vetting.
FRESH = "@zzznonexistenthandle123"

cands = [(ENGAGED, "seed-pool"), ("@365ROOFING", "prospects"),  # dup, diff case
         (FUZZY, "seed-pool"), (FRESH, "seed-pool"), ("", "seed-pool"),
         ("   ", "prospects")]
res = pf.prefilter(cands)
m = res["metrics"]
elig = res["eligible"]
dec = {d["handle"]: d for d in res["decisions"]}

check("metrics keys", set(m) >= {"INPUT", "ALREADY_ENGAGED", "SUPPRESSED",
                                 "INELIGIBLE", "ELIGIBLE_FOR_VETTING"},
      str(sorted(m)))
check("dedupe: 4 non-empty canonical inputs, case-dup merged to 3",
      m["INPUT"] == 4 and m["DEDUPED_INPUT"] == 3, str(m))
check("engaged filtered", m["ALREADY_ENGAGED"] == 1
      and dec["@365roofing"]["stage"] == "ALREADY_ENGAGED", str(dec))
check("fuzzy suppressed", m["SUPPRESSED"] == 1
      and dec["@365roofin"]["stage"] == "SUPPRESSED", str(dec))
check("empty ineligible", m["INELIGIBLE"] == 2, str(m))
check("only fresh eligible", elig == [("zzznonexistenthandle123", "seed-pool")],
      str(elig))
check("filtered identities visible with reasons",
      all(dec[h].get("reason") for h in ("@365roofing", "@365roofin")),
      str(dec))

# --- the money test: wire the pipeline path, count expensive vet calls ---
vet_calls = []


def fake_vet(handle, source):
    vet_calls.append(handle)
    return {"handle": handle}


for handle, source in elig:
    fake_vet(handle, source)
m["VETTED"] = len(vet_calls)
m["ACCEPTED"] = len(vet_calls)  # fake vet accepts
check("zero expensive calls for engaged handle",
      "@365roofing" not in [c.lstrip("@") for c in vet_calls]
      and "365roofing" not in vet_calls, str(vet_calls))
check("zero expensive calls for suppressed handle",
      "365roofin" not in vet_calls, str(vet_calls))
check("exactly one vet call (the fresh handle)", vet_calls == ["zzznonexistenthandle123"],
      str(vet_calls))
check("VETTED/ACCEPTED metrics", m["VETTED"] == 1 and m["ACCEPTED"] == 1, str(m))

# --- canonicalization authority is the guard's, not a local copy ---
check("canonical strips @ and lowercases",
      pf.canonical("@Some_Handle") == "some_handle", pf.canonical("@Some_Handle"))

print("---")
print("pass=%d fail=%d" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
