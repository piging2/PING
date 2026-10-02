#!/usr/bin/env python3
"""Isolated proof of closure-aware lifecycle reopen triggers.
Uses temp dirs only; never touches the real intel dir, OUT_DIR, or lifecycle store.
"""
import importlib.util, json, os, sys, tempfile

spec = importlib.util.spec_from_file_location(
    "reconcile", "/home/hatch/workspace/tandem/reconcile.py")
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)

PASS, FAIL = "PASS", "FAIL"
results = []
def check(name, cond, detail=""):
    results.append((PASS if cond else FAIL, name, detail))

tmp = tempfile.mkdtemp()
outd = os.path.join(tmp, "out"); intd = os.path.join(tmp, "intel")
os.makedirs(outd); os.makedirs(intd)
logp = os.path.join(tmp, "ingested.log"); open(logp, "w").write("")

EVID = "20260918-090448-d-segment-deep-dive.provenance.json"
evpath = os.path.join(intd, EVID)
open(evpath, "w").write('{"status":"answer_captured"}')

def disp_text(valid=True, cite=True):
    body = "# R2 Closure Record\n\n## Finding\nAll items already processed.\n"
    if cite:
        body += "## Ingestion Evidence\n1. **%s**\n   Ingested round 83.\n" % EVID
    if valid:
        body += ('## Closure Authority\n\nNolan directive, 2026-09-20 12:58 MDT: '
                 '"Close each item based on its current informational value."\n'
                 "\n## Status\n\nR2 CLOSED. No further action required.\n")
    else:
        body += "\n## Status\n\nstill looking into it.\n"
    return body

def write_disp(valid=True, cite=True):
    p = os.path.join(outd, "r2-closure-20260920.md")
    open(p, "w").write(disp_text(valid, cite))
    return p

def gap():
    return {"rule": "R2", "step": "DISTILL", "state": "NOT_RUN",
            "reason": "answer_captured for 99.9h with no terminal verify/emit/skip decision",
            "run_id": "d-segment-deep-dive", "input": EVID,
            "next_eligible_step": "x", "resumable": True}

NOW = "2026-09-21T12:40:00+00:00"
health = {"R2": True}

# 1. invalid disposition (no authority/CLOSED) -> stays OPEN
write_disp(valid=False)
store = {}
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("invalid disposition -> stays OPEN",
      store[rc.gap_key(gap())]["state"] == "OPEN",
      store[rc.gap_key(gap())]["state"])

# 2. valid disposition but evidence missing -> stays OPEN
write_disp(valid=True); os.remove(evpath)
store = {}
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("valid disposition + missing evidence -> stays OPEN",
      store[rc.gap_key(gap())]["state"] == "OPEN",
      store[rc.gap_key(gap())]["state"])

# 3. valid disposition + evidence -> KNOWN_PERMANENT
open(evpath, "w").write('{"status":"answer_captured"}')
store = {}
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
rec = store[rc.gap_key(gap())]
check("valid disposition + evidence -> KNOWN_PERMANENT",
      rec["state"] == "KNOWN_PERMANENT", rec["state"])
check("transition cites disposition + evidence",
      any(t["to"] == "KNOWN_PERMANENT" and "disposition" in t and "evidence" in t
          for t in rec["transitions"]),
      json.dumps(rec["transitions"][-1])[:160])

# 4. idempotent: second identical run -> stays KNOWN_PERMANENT, no new transition
n0 = len(rec["transitions"])
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("unchanged rerun -> stays KNOWN_PERMANENT, no transition spam",
      rec["state"] == "KNOWN_PERMANENT" and len(rec["transitions"]) == n0,
      "transitions=%d" % len(rec["transitions"]))

# 5. evidence changed -> REOPENED
open(evpath, "w").write('{"status":"answer_captured","note":"changed"}')
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("evidence changed -> REOPENED",
      rec["state"] == "REOPENED" and "source changed" in rec["transitions"][-1]["reason"],
      rec["transitions"][-1]["reason"][:120])

# 6. re-suppresses after change absorbed, then evidence disappears -> REOPENED
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("re-suppress after change absorbed", rec["state"] == "KNOWN_PERMANENT", rec["state"])
os.remove(evpath)
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("evidence disappeared -> REOPENED",
      rec["state"] == "REOPENED" and "disappeared" in rec["transitions"][-1]["reason"],
      rec["transitions"][-1]["reason"][:120])

# 7. disposition removed -> REOPENED
open(evpath, "w").write('{"status":"answer_captured"}')
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
os.remove(os.path.join(outd, "r2-closure-20260920.md"))
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("disposition removed -> REOPENED",
      rec["state"] == "REOPENED" and "disposition" in rec["transitions"][-1]["reason"].lower(),
      rec["transitions"][-1]["reason"][:120])

# 8. gap absent + rule healthy -> RESOLVED
write_disp(valid=True)
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)  # OPEN (no... wait REOPENED->suppressed?)
# state is REOPENED with disp+evidence -> suppressed again first
rc.run_lifecycle([], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("absent + healthy -> RESOLVED", rec["state"] == "RESOLVED", rec["state"])

# 9. RESOLVED gap recurs -> REOPENED
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store, intd, logp, health, NOW)
check("RESOLVED gap recurs -> REOPENED", rec["state"] == "REOPENED", rec["state"])

# 10. unhealthy rule must not resolve (absence proves nothing)
store2 = {}
rc.run_lifecycle([gap()], rc.parse_dispositions(outd), store2, intd, logp, health, NOW)
rec2 = store2[rc.gap_key(gap())]
rc.run_lifecycle([], rc.parse_dispositions(outd), store2, intd, logp, {"R2": False}, NOW)
check("unhealthy rule -> no auto-RESOLVE", rec2["state"] != "RESOLVED", rec2["state"])

# 11. no hardcoded list: a never-before-seen identifier with valid disp+evidence suppresses
E2 = "20990101-000000-z-never-seen.provenance.json"
open(os.path.join(intd, E2), "w").write("{}")
open(os.path.join(outd, "r9-closure-20260920.md"), "w").write(
    "# R9 Closure Record\n## Closure Authority\nNolan directive test.\n"
    "## Evidence\n`%s`\n## Status\nR9 CLOSED.\n" % E2)
g2 = dict(gap()); g2["rule"] = "R9"; g2["input"] = E2; g2["run_id"] = "z-never-seen"
store3 = {}
rc.run_lifecycle([g2], rc.parse_dispositions(outd), store3, intd, logp, {"R9": True}, NOW)
check("generic: unseen identifier w/ valid disp+evidence -> KNOWN_PERMANENT",
      store3[rc.gap_key(g2)]["state"] == "KNOWN_PERMANENT",
      store3[rc.gap_key(g2)]["state"])

print()
fails = 0
for s, name, detail in results:
    print("%s  %s%s" % (s, name, ("  [" + detail + "]") if detail and s == "FAIL" else ""))
    fails += (s == "FAIL")
print("\n%d/%d passed" % (len(results) - fails, len(results)))
sys.exit(1 if fails else 0)
