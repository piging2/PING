#!/usr/bin/env python3
"""FIXTURE FC-2: no-retry-on-pool-drop wedges the loop. GENERIC CLASS.

Repro: pool drops; a single-attempt transactional unit raises ConnectionGone;
no progress is possible until the pool heals. With bounded retry the same
unit heals and applies exactly once.

Run: python3 fixtures/fc2-pool-drop-wedge.py
Expects: WEDGED then HEALED.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g


def main():
    g.init_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc2-repro")
    conn.close()
    pool = g.FlakyPool()
    pool.drop_all(gone_calls=10**9)  # outage until heal()

    wedged = False
    try:
        pool.tx(lambda c: g.new_packet(c, run_id), retries=1, backoff=0.01)
    except g.ConnectionGone:
        wedged = True
    print("WEDGED" if wedged else "UNEXPECTED: op survived the outage")

    pool.heal()
    pid = pool.tx(lambda c: g.new_packet(c, run_id, payload={"fc2": 1})[0],
                  retries=3, backoff=0.05)
    conn = g.db()
    ok = wedged and g.get_packet(conn, pid) is not None
    print("HEALED" if ok else "HEAL FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
