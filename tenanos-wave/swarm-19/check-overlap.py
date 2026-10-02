#!/usr/bin/env python3
"""check-overlap.py: merge-conflict early warning for the TenantOS wave.

Compares claimed_areas globs across all non-terminal proposals in
~/workspace/tenanos-wave/STATE.json and reports overlaps so the coordinator
can serialize writers BEFORE diffs collide.

Usage:
  python3 check-overlap.py                      # check all non-terminal proposals
  python3 check-overlap.py --proposal P-20260923-004   # check one proposal against the rest
Exit code 0 = no overlap, 1 = overlap found.
"""
import fnmatch
import json
import os
import sys

STATE_PATH = os.path.expanduser("~/workspace/tenanos-wave/STATE.json")
NON_TERMINAL = {"proposed", "approved", "applied", "tested"}


def norm(g):
    # Treat "dir/**" as also matching "dir" itself and vice versa; make
    # "package.json" match exactly. Compare both raw and stripped forms.
    return g.rstrip("/")


def globs_overlap(a, b):
    a, b = norm(a), norm(b)
    if a == b:
        return True
    # fnmatch both directions covers "src/tenanos/**" vs "src/tenanos/mission/x.ts"
    # and identical patterns; also try prefix containment for dir globs.
    if fnmatch.fnmatch(a, b) or fnmatch.fnmatch(b, a):
        return True
    for x, y in ((a, b), (b, a)):
        if x.endswith("/**") and (y == x[:-3] or y.startswith(x[:-2])):
            return True
    return False


def main():
    with open(STATE_PATH) as f:
        state = json.load(f)
    only = None
    if len(sys.argv) == 3 and sys.argv[1] == "--proposal":
        only = sys.argv[2]

    active = [p for p in state["proposals"] if p["status"] in NON_TERMINAL]
    hits = []
    for i, p in enumerate(active):
        if only and p["id"] != only:
            continue
        for q in active[i + 1:]:
            if only and q["id"] != only and p["id"] != only:
                continue
            for ga in p.get("claimed_areas", []):
                for gb in q.get("claimed_areas", []):
                    if globs_overlap(ga, gb):
                        hits.append((p["id"], p["swarm"], q["id"], q["swarm"], ga, gb))
    if hits:
        print("OVERLAP DETECTED (serialize writers before approving):")
        for pid, ps, qid, qs, ga, gb in hits:
            print(f"  {pid} (swarm {ps}) <-> {qid} (swarm {qs}): '{ga}' vs '{gb}'")
        return 1
    print("No claimed-area overlap among non-terminal proposals.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
