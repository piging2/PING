#!/usr/bin/env python3
"""FIXTURE FC-3: non-durable dispatch intent lost on pre-write coordinator
death. GENERIC CLASS.

Repro: a coordinator derives its dispatch plan from private memory (the
--packets count) and dies mid-claim, before its first durable write. The
recovery coordinator finds no packets, requeues nothing, and the intended
work silently never exists.

Run: python3 fixtures/fc3-nondurable-intent.py
Expects: LOST-STATE (0 packets recovered from 2 intended). If this ever
prints SURVIVED, the class is fixed or the fixture rotted.

Fix direction (proven by probes/run_durable_intent.py): the planner enqueues
intent durably BEFORE any coordinator reign; the next reign adopts it.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "harness")
COORD = os.path.join(HARNESS, "coord_proc.py")


def main():
    g.init_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc3-repro")
    conn.close()

    # coordinator derives intent from its private --packets arg, dies mid-claim
    d = subprocess.run(
        [sys.executable, COORD, "--mode", "dispatch",
         "--holder", "coord-fc3", "--run-id", run_id, "--packets", "2",
         "--die-at", "mid-claim", "--die-mode", "kill"],
        capture_output=True, timeout=60)
    assert d.returncode == -9 or d.returncode == 137

    # recovery: lock freed, epoch bumped, but there is nothing to recover
    r = subprocess.run(
        [sys.executable, COORD, "--mode", "recover",
         "--holder", "coord-fc3-r", "--run-id", run_id],
        capture_output=True, text=True, timeout=60)
    assert r.returncode == 0
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM packets WHERE run_id=?", (run_id,))
    n = cur.fetchone()[0]
    print(f"intended=2 recovered_packets={n}")
    print("LOST-STATE" if n == 0 else "SURVIVED")
    return 0 if n == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
