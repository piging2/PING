#!/usr/bin/env python3
"""Unit tests for check-geography-contract.py. Run: python3 this file."""
import importlib.util
import os
import sys
import tempfile

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "geo_gate", os.path.join(_HERE, "check-geography-contract.py"))
g = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(g)

PASS = 0
FAIL = 0


def ok(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"ok   {name}")
    else:
        FAIL += 1
        print(f"FAIL {name} {detail}")


# 1. Authority parse: AGENTS.md must yield the 13 in-zone towns.
in_zone, _ = g.parse_in_zone()
expected = {"grand junction", "fruita", "palisade", "clifton", "collbran",
            "loma", "mack", "de beque", "delta", "montrose", "rifle",
            "carbondale"}
ok("authority parses 12+ towns", in_zone is not None and expected <= in_zone,
   f"got={in_zone}")

# 2c. The real a-brief, now fixed, must PASS (checked against the real
# prompts dir, before the synthetic override below).
v, m = g.check("a-weak-website-hunt")
ok("fixed a-brief compatible", v == "compatible", m)

# Synthetic briefs in a temp prompts dir.
tmp = tempfile.mkdtemp()
g.PROMPTS = tmp


def synth(slug, text):
    open(os.path.join(tmp, slug + ".md"), "w").write(text)


# 2b. The stale a-brief line (pre-2026-09-21 fix) as a synthetic fixture:
# it must FAIL the gate.
synth("t-stale-a",
      "Find 12 specific, real home-service businesses in the geography "
      "above. Prioritize towns we have not covered yet: Palisade, Clifton, "
      "Delta, Cortez, Pagosa Springs, Rifle, Craig, Meeker.")
v, m = g.check("t-stale-a")
ok("stale town list is incompatible", v == "incompatible", m)
ok("flags cortez", "cortez" in m, m)
ok("flags pagosa springs", "pagosa springs" in m, m)
ok("flags craig", "craig" in m, m)
ok("flags meeker", "meeker" in m, m)


synth("t-inzone",
      "Find businesses. Prioritize towns we have not covered yet: "
      "Palisade, Clifton, Delta, Rifle.")
v, m = g.check("t-inzone")
ok("in-zone-only list compatible", v == "compatible", m)

synth("t-excl",
      "Find businesses in the geography above. Exclude Cortez and "
      "Pagosa Springs from this run; no Craig or Meeker.")
v, m = g.check("t-excl")
ok("exclusion-only mentions compatible", v == "compatible", m)

synth("t-mixed",
      "Focus on Delta, not Cortez, for the next pass. Prioritize Clifton.")
v, m = g.check("t-mixed")
ok("mixed include/exclude compatible", v == "compatible", m)

synth("t-out",
      "Cover Montrose and Telluride shops this week.")
v, m = g.check("t-out")
ok("out-of-zone target incompatible", v == "incompatible", m)
ok("flags telluride", "telluride" in m, m)

synth("t-neutral",
      "Find 12 businesses in the geography above. No town list given.")
v, m = g.check("t-neutral")
ok("no town mentions compatible", v == "compatible", m)

synth("t-ambig",
      "Report what you find. The Durango office called twice.")
v, m = g.check("t-ambig")
ok("ambiguous prose fails open", v == "compatible", m)

v, m = g.check("t-does-not-exist")
ok("missing brief is infra", v == "infra", m)

print(f"\n{PASS} passed, {FAIL} failed")
sys.exit(1 if FAIL else 0)
