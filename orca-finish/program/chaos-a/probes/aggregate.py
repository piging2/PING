#!/usr/bin/env python3
"""Aggregate CHAOS-A probe records into verdict counts, mission totals,
failure classes, and the probe table for CHAOS-RESULTS.md."""
import json
import os
import sys
from collections import Counter, defaultdict

CHAOS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS = os.path.join(CHAOS_DIR, "evidence", "probe-records.jsonl")

# Superseded records: kept in the raw file (never delete evidence), excluded
# from verdict counts. Documented in CHAOS-RESULTS.md section 6.
SUPERSEDED = {
    # pre-fix crash-smoke: supervisor audited under run_id "unknown" and
    # recovery raced the OUTCOME_UNKNOWN status (harness bugs, since fixed;
    # superseded by the full-run crash probes)
    "probe-bef8c91f", "probe-5e17019b",
    # local accident: collision probe reused idem key "coll-0-0" across the
    # validation smoke and the full run (probe bug, since fixed with uuid keys;
    # superseded by the 12 re-run collision probes)
    "probe-3e615e67",
    # probe-harness syntax error in coord_proc adopt edit (fixed; the 3
    # SURVIVED durable-intent probes from the re-run are valid and kept)
    "probe-1414030d", "probe-47fd2735", "probe-f411ccd8",
}


def main():
    recs = [json.loads(l) for l in open(RECORDS) if l.strip()]
    raw_n = len(recs)
    recs = [r for r in recs if r["probe_id"] not in SUPERSEDED]
    by_verdict = Counter(r["CLASSIFICATION"] for r in recs)
    by_domain = Counter(r["DOMAIN"] for r in recs)
    missions = sum(r.get("missions", 0) for r in recs)

    print(f"total probe records: {len(recs)} (raw {raw_n}, "
          f"{raw_n - len(recs)} superseded/excluded)")
    print(f"total missions: {missions}")
    print("\nby verdict:")
    for v, n in by_verdict.most_common():
        print(f"  {v}: {n}")
    print("\nby domain:")
    for d, n in by_domain.most_common():
        print(f"  {d}: {n}")

    print("\nnon-SURVIVED records:")
    for r in recs:
        if r["CLASSIFICATION"] != "SURVIVED":
            d = r.get("detail", {})
            fc = d.get("failure_class", d.get("failure_class", ""))
            print(f"  [{r['CLASSIFICATION']}] {r['DOMAIN']} {r['COMPONENT'][:60]} "
                  f"missions={r.get('missions')} :: {fc or r['verdict_notes'][:90]}")

    # failure classes: group non-survived by failure_class text
    classes = defaultdict(list)
    for r in recs:
        if r["CLASSIFICATION"] in ("DUPLICATED", "LOST-STATE", "WEDGED"):
            fc = r.get("detail", {}).get("failure_class") or r["verdict_notes"]
            classes[(r["CLASSIFICATION"], fc[:120])].append(r["probe_id"])
    print("\nFAILURE CLASSES:")
    for (v, fc), ids in classes.items():
        print(f"  [{v}] {fc}  (n={len(ids)})")

    # confidence summary
    confs = [r["CONFIDENCE"] for r in recs]
    print(f"\nmean confidence: {sum(confs)/len(confs):.3f}  min: {min(confs):.2f}")

    # broken boundaries
    bb = Counter(r["BROKEN BOUNDARY"] for r in recs if r["BROKEN BOUNDARY"] != "none")
    if bb:
        print("\nbroken boundaries observed:")
        for b, n in bb.most_common():
            print(f"  {b}: {n}")


if __name__ == "__main__":
    main()
