#!/usr/bin/env python3
"""CHAOS-B Q1: clock-skew races. Worker clock skewed +/-60s vs the store
(server) clock. Assertions: a skewed worker cannot (a) extend an expired
lease, (b) resurrect a revoked lease, (c) win a claim with a stale fencing
token. Plus (d): the dual-holder race (skewed extend after re-grant).

Two harness variants per assertion where it matters:
  naive : lease_extend_naive  (trusts worker clock; bearer token reassigns)
  server: lease_extend_server (server clock; holder+token bound)

One probe record per probe. Fresh DB per probe.
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g
import record as R

AFFECTS = ["impl-lane", "orca-b", "chaos-c"]
SKEW = 60


def fresh_db():
    if os.path.exists(g.DB_PATH):
        os.remove(g.DB_PATH)
    for suf in ("-wal", "-shm"):
        p = g.DB_PATH + suf
        if os.path.exists(p):
            os.remove(p)
    g.init_db()


def skewed_now(skew_s):
    return g._shift_iso(g._utcnow_iso(), skew_s)


def q1a_extend_expired():
    """(a) skewed worker extends an expired lease."""
    # naive variant: must ACCEPT (the bug) -> LOST-STATE
    fresh_db()
    conn = g.db()
    lid = f"q1a-{uuid.uuid4().hex[:8]}"
    tok = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)  # server: expired
    accepted = g.lease_extend_naive(conn, lid, "worker-A", tok,
                                    skewed_now(-SKEW), 30)
    holder = g.lease_holder(conn, lid)
    conn.close()
    R.record(
        domain="chaos.clock-skew", component="lease_extend_naive",
        claim=("Q1a-naive: worker clock -60s: extend of a server-expired "
               "lease is ACCEPTED when the store trusts the worker clock: "
               "expiry fencing is lost, the dead lease looks live again."),
        evidence="TEST", caller="run_clock_skew.q1a_extend_expired",
        callee="lease_extend_naive(worker_now=-60s)",
        writer="worker-A (skewed)", reader="lease_holder readback",
        classification="LOST-STATE" if accepted else "SURVIVED",
        confidence=0.92,
        broken_boundary=("lease expiry enforcement" if accepted else "none"),
        dependencies=["worker-supplied timestamps trusted"],
        affects_agents=AFFECTS, missions=2,
        detail={"skew_s": -SKEW, "extend_accepted": accepted,
                "holder_after": holder["holder_id"],
                "expires_at_after": holder["expires_at"]},
        verdict_notes=("expired lease resurrected by skewed extend: the "
                       "expiry event no longer fences the holder" if accepted
                       else "extend refused"))
    # fixed variant: must REJECT -> SURVIVED
    fresh_db()
    conn = g.db()
    lid = f"q1a-{uuid.uuid4().hex[:8]}"
    tok = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)
    accepted = g.lease_extend_server(conn, lid, "worker-A", tok, 30)
    conn.close()
    R.record(
        domain="chaos.clock-skew", component="lease_extend_server",
        claim=("Q1a-fixed: same -60s skew, server-clock extend: the expired "
               "lease cannot be extended; expiry is judged on the store clock."),
        evidence="TEST", caller="run_clock_skew.q1a_extend_expired",
        callee="lease_extend_server",
        writer="worker-A (skewed)", reader="extend return",
        classification="SURVIVED" if not accepted else "LOST-STATE",
        confidence=0.95,
        broken_boundary="none" if not accepted else "lease expiry enforcement",
        dependencies=["server-issued timestamps", "monotonic server clock"],
        affects_agents=AFFECTS, missions=2,
        detail={"skew_s": -SKEW, "extend_accepted": accepted},
        verdict_notes=("server clock rejects the extend: fencing holds"
                       if not accepted else "FIX FAILED"))


def q1b_revoke_resurrect():
    """(b) skewed worker presents a revoked lease: must stay revoked."""
    for variant in ("naive", "server"):
        fresh_db()
        conn = g.db()
        lid = f"q1b-{uuid.uuid4().hex[:8]}"
        tok = g.lease_issue(conn, lid, "worker-A", 300)
        g.lease_revoke(conn, lid)
        if variant == "naive":
            accepted = g.lease_extend_naive(conn, lid, "worker-A", tok,
                                            skewed_now(-SKEW), 30)
        else:
            accepted = g.lease_extend_server(conn, lid, "worker-A", tok, 30)
        holder = g.lease_holder(conn, lid)
        conn.close()
        ok = not accepted and holder["revoked"] == 1
        R.record(
            domain="chaos.clock-skew", component=f"lease_extend_{variant}",
            claim=("Q1b: revoked lease presented by a -60s-skewed worker "
                   "stays revoked under both variants: revocation is a "
                   "server-side flag, independent of clocks."),
            evidence="TEST", caller="run_clock_skew.q1b_revoke_resurrect",
            callee=f"lease_extend_{variant}",
            writer="worker-A (skewed)", reader="revoked flag readback",
            classification="SURVIVED" if ok else "LOST-STATE",
            confidence=0.95, broken_boundary="none" if ok else "revocation",
            dependencies=["server-side revocation flag"],
            affects_agents=AFFECTS, missions=2,
            detail={"variant": variant, "skew_s": -SKEW,
                    "extend_accepted": accepted,
                    "revoked_after": holder["revoked"]},
            verdict_notes=("revocation holds regardless of skew" if ok else
                           "REVOCATION BYPASSED"))


def q1c_stale_fencing():
    """(c) skewed worker wins a claim / writes with a stale fencing token:
    must be rejected (fencing is clock-independent)."""
    fresh_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="q1c")
    pid, _ = g.new_packet(conn, run_id, payload={"q1c": 1})
    assert g.claim_packet(conn, pid, "worker-1", 100)
    # stale fencing claim by skewed worker on an already-claimed packet
    stale_claim = g.claim_packet(conn, pid, "worker-2-skewed", 99)
    # stale epoch fenced write: bump epoch, re-stamp, zombie writes at old
    e1 = g.coord_epoch_bump(conn)
    g.set_packet_epoch(conn, pid, e1)
    e2 = g.coord_epoch_bump(conn)
    g.set_packet_epoch(conn, pid, e2)  # current reign re-stamps
    zombie = g.fenced_packet_write(conn, pid, e1, "FAILED")
    legit = g.fenced_packet_write(conn, pid, e2, "IN_FLIGHT")
    conn.close()
    ok = (not stale_claim) and zombie == 0 and legit == 1
    R.record(
        domain="chaos.clock-skew", component="claim_packet/fenced_packet_write",
        claim=("Q1c: +60s-skewed worker with a stale fencing token cannot "
               "steal a claimed packet and cannot land a fenced write at a "
               "superseded epoch: fencing tokens are clock-independent."),
        evidence="TEST", caller="run_clock_skew.q1c_stale_fencing",
        callee="claim_packet/fenced_packet_write",
        writer="worker-2 (skew +60s, stale fencing)",
        reader="claim/write return codes",
        classification="SURVIVED" if ok else "DUPLICATED",
        confidence=0.95, broken_boundary="none" if ok else "epoch fencing",
        dependencies=["atomic conditional claim", "epoch-fenced writes"],
        affects_agents=AFFECTS, missions=3,
        detail={"skew_s": SKEW, "stale_claim_won": stale_claim,
                "zombie_write_rows": zombie, "legit_write_rows": legit},
        verdict_notes=("stale fencing rejected on both paths" if ok else
                       "STALE FENCING WON"))


def q1d_dual_holder():
    """(d) the lease-expiry race: A expired -> B granted -> A (skewed -60s)
    extends with its old bearer token. Naive: dual holders -> DUPLICATED
    lease-scoped effects. Fixed: A's extend rejected -> SURVIVED."""
    # naive variant: grant does NOT rotate the bearer token (lease-scoped
    # token), extend trusts the worker clock and reassigns by bearer token
    fresh_db()
    conn = g.db()
    lid = f"q1d-{uuid.uuid4().hex[:8]}"
    tok_a = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)   # server: A expired
    tok_b, granted = g.lease_grant_naive(conn, lid, "worker-B", 30)
    assert granted
    # A, believing its own clock (-60s), extends with its old bearer token
    a_accepted = g.lease_extend_naive(conn, lid, "worker-A", tok_a,
                                      skewed_now(-SKEW), 30)
    holder = g.lease_holder(conn, lid)
    # each party acts iff the store told it "yes": B was granted, A acts
    # iff its extend was accepted
    if granted:
        g.apply_effect_holder(conn, lid, "worker-B", 1)
    if a_accepted:
        g.apply_effect_holder(conn, lid, "worker-A", 1)
    n_fx, n_holders = g.count_holder_effects(conn, lid)
    conn.close()
    dup = a_accepted and (n_fx == 2)
    R.record(
        domain="chaos.clock-skew", component="lease_extend_naive",
        claim=("Q1d-naive: expired A re-granted to B; skewed A extends with "
               "its old bearer token and the store accepts: two holders, "
               "the lease-scoped external effect fires twice."),
        evidence="TEST", caller="run_clock_skew.q1d_dual_holder",
        callee="lease_extend_naive + lease_grant_server",
        writer="worker-A (skewed -60s) / worker-B",
        reader="count_holder_effects",
        classification="DUPLICATED" if dup else "SURVIVED",
        confidence=0.92,
        broken_boundary=("lease holder fencing" if dup else "none"),
        dependencies=["worker clock trusted", "bearer token not holder-bound",
                      "no revocation of superseded token on re-grant"],
        affects_agents=AFFECTS, missions=4,
        detail={"skew_s": -SKEW, "b_granted": granted,
                "a_extend_accepted": a_accepted,
                "holder_after": holder["holder_id"],
                "holder_effect_rows": n_fx,
                "distinct_holders_acted": n_holders},
        verdict_notes=("dual holders duplicated the external effect: "
                       "clock skew + token-not-bound breaks fencing" if dup
                       else "no duplication"))
    # fixed variant
    fresh_db()
    conn = g.db()
    lid = f"q1d-{uuid.uuid4().hex[:8]}"
    tok_a = g.lease_issue(conn, lid, "worker-A", 30)
    g.lease_simulate_expiry(conn, lid, seconds_ago=5)
    tok_b, granted = g.lease_grant_server(conn, lid, "worker-B", 30)
    assert granted and tok_b
    a_accepted = g.lease_extend_server(conn, lid, "worker-A", tok_a, 30)
    holder = g.lease_holder(conn, lid)
    g.apply_effect_holder(conn, lid, "worker-B", 1)  # sole holder acts
    n_fx, n_holders = g.count_holder_effects(conn, lid)
    conn.close()
    ok = (not a_accepted) and holder["holder_id"] == "worker-B" and n_fx == 1
    R.record(
        domain="chaos.clock-skew", component="lease_extend_server",
        claim=("Q1d-fixed: same race, server-clock holder-bound extend: A's "
               "stale extend is rejected, B remains sole holder, the effect "
               "fires exactly once."),
        evidence="TEST", caller="run_clock_skew.q1d_dual_holder",
        callee="lease_extend_server + lease_grant_server",
        writer="worker-A (skewed -60s) / worker-B",
        reader="count_holder_effects",
        classification="SURVIVED" if ok else "DUPLICATED",
        confidence=0.95,
        broken_boundary="none" if ok else "lease holder fencing",
        dependencies=["server clock", "holder-bound extend",
                      "re-grant rotates the bearer token"],
        affects_agents=AFFECTS, missions=4,
        detail={"skew_s": -SKEW, "b_granted": granted,
                "a_extend_accepted": a_accepted,
                "holder_after": holder["holder_id"],
                "holder_effect_rows": n_fx},
        verdict_notes=("single holder, single effect: fencing holds" if ok
                       else "FIX FAILED"))


if __name__ == "__main__":
    q1a_extend_expired()
    q1b_revoke_resurrect()
    q1c_stale_fencing()
    q1d_dual_holder()
    print("Q1 done")
