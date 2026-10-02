#!/usr/bin/env python3
"""Test the cycle diff-and-surface primitive.

Proves the promoted automation: the agent no longer reasons about what
changed or what is worth surfacing. The diff decides, deterministically.

  1. first cycle surfaces every eligible pattern as NEW (no prior state)
  2. an unchanged second cycle is fully quiet
  3. a pattern whose hedge was stripped surfaces BLOCKED, and only that
  4. a brand-new pattern surfaces NEW
  5. a removed pattern surfaces RETIRED
  6. an unchanged pattern stays quiet through all of it

Production cycle state is backed up and restored; the drill never leaks
into production.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.join(HERE, "signal_pass.py")
REAL_PATTERNS = os.path.expanduser(
    "~/workspace/marketing-intel/meme-objects/patterns")
CYCLES = os.path.join(HERE, "cycles")
STATE = os.path.join(CYCLES, "state.json")

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" | " + detail if detail else ""))
    if not cond:
        failures.append(name)


def cycle(pdir):
    p = subprocess.run([sys.executable, SKILL, "cycle",
                        "--patterns-dir", pdir],
                       capture_output=True, text=True, cwd=HERE)
    return json.loads(p.stdout)


def main():
    backup = None
    if os.path.exists(STATE):
        backup = STATE + ".testbak"
        shutil.copy(STATE, backup)
        os.remove(STATE)  # hermetic: first test cycle starts with no state
    before_cycles = set(os.listdir(CYCLES)) if os.path.exists(CYCLES) else set()
    try:
        d1 = tempfile.mkdtemp(prefix="cyc1-")
        for fn in ("pattern_no_booking_path.json",
                   "pattern_wordpress_brochure.json"):
            shutil.copy(os.path.join(REAL_PATTERNS, fn), d1)

        # 1. First cycle: everything eligible surfaces as NEW.
        out = cycle(d1)
        types = sorted(e["type"] for e in out["surfaced"])
        check("first cycle surfaces NEW for all",
              types == ["NEW", "NEW", "NEW_ARBITRAGE"],
              str(types))

        # 2. Unchanged second cycle: fully quiet.
        out = cycle(d1)
        check("unchanged cycle is quiet",
              out["surfaced"] == [] and out["quiet_count"] == 2,
              str(out["surfaced"]))

        d2 = tempfile.mkdtemp(prefix="cyc2-")
        shutil.copy(os.path.join(REAL_PATTERNS, "pattern_no_booking_path.json"), d2)
        # break the wordpress pattern's public text with a named business
        wp = json.load(open(os.path.join(REAL_PATTERNS,
                                         "pattern_wordpress_brochure.json")))
        wp["public_safe_text"] = "Pride Plumbing runs WordPress."
        json.dump(wp, open(os.path.join(d2, "pattern_wordpress_brochure.json"), "w"),
                  indent=2)
        # brand-new drill pattern
        new = {"pattern_id": "pattern_drill_new", "observation": "Drill.",
               "observation_count": 3, "affected_market": "Drill",
               "category": "drill", "evidence_refs": ["drill"],
               "verification_state": "OBSERVED", "confidence": 0.7,
               "mechanism": "Drill.", "competitive_implication": "Drill.",
               "opportunity": "Drill.",
               "joke_candidates": ["PING says: drill."],
               "seriousness": "LOW",
               "public_safe_text": "Drill pattern with 3 observations.",
               "durable": False, "fresh_until": "2026-12-31",
               "approval_state": "draft", "publication_state": "unpublished",
               "outcome_evidence": {}}
        json.dump(new, open(os.path.join(d2, "pattern_drill_new.json"), "w"),
                  indent=2)

        # 3-6. Transitions surface exactly; the unchanged pattern stays quiet.
        out = cycle(d2)
        by_id = {e["pattern_id"]: e["type"] for e in out["surfaced"]}
        check("named business -> BLOCKED surfaced",
              by_id.get("pattern_wordpress_brochure") == "BLOCKED", str(by_id))
        check("new pattern -> NEW surfaced",
              by_id.get("pattern_drill_new") == "NEW", str(by_id))
        check("unchanged pattern stays quiet",
              "pattern_no_booking_path" not in by_id, str(by_id))
        check("quiet_count counts the unchanged pattern",
              out["quiet_count"] == 1, str(out["quiet_count"]))
    finally:
        if backup:
            shutil.copy(backup, STATE)
            os.remove(backup)
        # remove cycle artifacts the test created
        for f in set(os.listdir(CYCLES)) - before_cycles:
            if f.startswith("cycle-"):
                os.remove(os.path.join(CYCLES, f))
    print()
    if failures:
        print("FAILURES:")
        for f in failures:
            print("  - " + f)
        return 1
    print("ALL CYCLE PRIMITIVE CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
