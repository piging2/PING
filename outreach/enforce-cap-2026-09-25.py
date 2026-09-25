#!/usr/bin/env python3
"""One-time 2026-09-25: enforce the 300-active cap on the canonical prospect store.

Archives the deterministically weakest WATCH rows via prospect_store
(exclusive file lock, in-memory build, .tmp + verify + atomic replace).
Idempotent: a second run finds the cap satisfied and does nothing.
"""
import sys

sys.path.insert(0, "/home/hatch/workspace/outreach")
from prospect_store import (ProspectStore, active_count,
                            select_archive_candidates)

REASON = ("quality-cap 300 active (2026-09-25 Lane G checkpoint): weakest WATCH, "
          "no signal in 2+ sweeps, lowest fit (no email route, no next action, "
          "no ladder/sent/queued/owner/unknown-effect, not fresh); archived to "
          "restore the 300-active cap after the 2026-09-25 new-business-radar "
          "merge breached it (307 active)")


def main():
    with ProspectStore() as ps:
        rows = ps.rows
        n_active = active_count(rows)
        print("active: %d total: %d" % (n_active, len(rows)))
        need = n_active - 300
        if need <= 0:
            print("cap satisfied, nothing to do")
            return 0
        cands = select_archive_candidates(rows, need)
        print("archiving %d:" % len(cands))
        for c in cands:
            print(" -", c["business_name"])
        drop = {c["business_name"] for c in cands}
        ps.commit([r for r in rows if r["business_name"] not in drop],
                  archived_rows=cands, archive_reason=REASON)
        print("new active: %d total: %d" % (active_count(ps.rows), len(ps.rows)))
        return 0


if __name__ == "__main__":
    sys.exit(main())
