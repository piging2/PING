#!/usr/bin/env python3
"""FIXTURE FC-5: worker-clock-trusted lease extend breaks fencing.
GENERIC CLASS.

Facet 1 (LOST-STATE): a worker whose clock is -60s extends a lease the
server already considers expired. The naive store trusts the worker's
timestamp, accepts the extend, and the dead lease looks live again: the
expiry event no longer fences the holder.

Facet 2 (DUPLICATED): A expired -> server re-grants to B -> skewed A
extends with its old bearer token (token not bound to the current holder).
The naive store accepts: two holders, and the lease-scoped external effect
fires twice.

Fixed variant (same file): server-clock, holder-bound extend rejects both.
expiry is judged on the store clock; a superseded token cannot reassign
the holder.

Run: python3 fixtures/fc5-clock-skew-lease.py
Expects: RESURRECTED then DUPLICATED(2) then FENCING-HOLDS.
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g

SKEW = 60


def skewed_now(skew_s):
    return g._shift_iso(g._utcnow_iso(), skew_s)


def main():
    g.init_db()
    conn = g.db()

    # --- facet 1: extend of an expired lease ---
    lid = f"fc5a-{uuid.uuid4().hex[:8]}"
    tok_a = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)  # server: expired
    naive_ok = g.lease_extend_naive(conn, lid, "worker-A", tok_a,
                                    skewed_now(-SKEW), 30)
    print("RESURRECTED" if naive_ok else "facet1: no bug (unexpected)")
    fixed_ok = g.lease_extend_server(conn, lid, "worker-A", tok_a, 30)
    print("facet1-fixed: rejected" if not fixed_ok else "facet1-fixed: ACCEPTED (bad)")

    # --- facet 2: dual holders duplicate the external effect ---
    # naive grant does NOT rotate the bearer token (lease-scoped token)
    lid = f"fc5b-{uuid.uuid4().hex[:8]}"
    tok_a = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)
    tok_b, granted = g.lease_grant_naive(conn, lid, "worker-B", 30)
    assert granted
    a_back = g.lease_extend_naive(conn, lid, "worker-A", tok_a,
                                  skewed_now(-SKEW), 30)
    if granted:
        g.apply_effect_holder(conn, lid, "worker-B", 1)
    if a_back:
        g.apply_effect_holder(conn, lid, "worker-A", 1)
    n_fx, n_holders = g.count_holder_effects(conn, lid)
    print(f"DUPLICATED({n_fx} effects, {n_holders} holders)"
          if (a_back and n_fx == 2) else "facet2: no bug (unexpected)")

    # --- fixed variant of facet 2 ---
    lid = f"fc5c-{uuid.uuid4().hex[:8]}"
    tok_a = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)
    tok_b, granted = g.lease_grant_server(conn, lid, "worker-B", 30)
    assert granted
    a_back = g.lease_extend_server(conn, lid, "worker-A", tok_a, 30)
    holder = g.lease_holder(conn, lid)
    g.apply_effect_holder(conn, lid, "worker-B", 1)
    n_fx, _ = g.count_holder_effects(conn, lid)
    fencing_holds = (not a_back) and holder["holder_id"] == "worker-B" and n_fx == 1
    print("FENCING-HOLDS" if fencing_holds else "fixed variant FAILED")
    conn.close()
    return 0 if (naive_ok and not fixed_ok and n_fx == 1 and fencing_holds) else 1


if __name__ == "__main__":
    sys.exit(main())
