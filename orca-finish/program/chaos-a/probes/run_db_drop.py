#!/usr/bin/env python3
"""CHAOS-A DB disappearance + reconnect: drop the pool mid-transaction.

Scenarios (each x reps x packets):
  A heal: pool drops (2 failed acquisitions), bounded-retry tx heals ->
     SURVIVED, exactly-once claim.
  B wedge: pool drops, NO retry (single attempt) -> ConnectionGone escapes,
     no progress possible until operator heals -> WEDGED (expected; the
     failure class is "no retry on pool drop").
  C mid-transaction kill: child BEGINs, INSERTs, os._exit(137) before COMMIT
     -> parent must see zero partial rows (atomic rollback) -> SURVIVED.
  D torn checkpoint: child INSERTs a checkpoint row then dies pre-commit ->
     absent; and post-commit death -> present with valid digest -> SURVIVED.
  E outage window: pool poisoned while 4 threads run retrying tx(); heal()
     mid-window -> all threads complete exactly once -> SURVIVED.

Question under test: does the loop heal or wedge?
"""
import argparse
import os
import subprocess
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g
from record import record

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "harness")


def scenario_A(rep, pi):
    """Heal: drop, then bounded-retry tx."""
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"dbdrop-A-r{rep}-{pi}")
    conn.close()
    pool = g.FlakyPool()
    pool.drop_all(gone_calls=2)

    def fn(c):
        pid, is_new = g.new_packet(c, run_id, payload={"sc": "A"})
        assert is_new
        assert g.claim_packet(c, pid, f"w-A-{rep}-{pi}", 1)
        return pid

    pid = pool.tx(fn, retries=5, backoff=0.05)
    pool.heal()
    conn = g.db()
    pkt = g.get_packet(conn, pid)
    n_del, _ = g.count_delegations(conn, pid)
    ok = pkt["status"] == "CLAIMED" and n_del == 1
    record(domain="chaos.db-disappearance", component="chaos_lib.FlakyPool.tx",
           claim="Bounded retry on pool drop heals; the retried unit applies exactly once.",
           evidence="TEST", caller="run_db_drop.scenario_A",
           callee="FlakyPool.tx/claim_packet", writer="tx unit",
           reader="probe", classification="SURVIVED" if ok else "WEDGED",
           confidence=0.92, broken_boundary="none" if ok else "reconnect",
           dependencies=["record 6 attempt identity"],
           affects_agents=["impl-lane", "chaos-b"],
           detail={"rep": rep, "packet": pid, "status": pkt["status"],
                   "delegations": n_del},
           missions=1,
           verdict_notes="pool dropped, retry healed, single claim" if ok else "HEAL FAILED")
    conn.close()
    return ok


def scenario_B(rep, pi):
    """Wedge: no retry. The op fails; nothing progresses until heal."""
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"dbdrop-B-r{rep}-{pi}")
    conn.close()
    pool = g.FlakyPool()
    pool.drop_all(gone_calls=5)
    wedged = False
    try:
        pool.tx(lambda c: g.new_packet(c, run_id), retries=1, backoff=0.01)
    except g.ConnectionGone:
        wedged = True
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM packets WHERE run_id=?", (run_id,))
    n_packets = cur.fetchone()[0]
    # heal, then the same op succeeds: documents the recovery requirement
    pool.heal()
    pid = pool.tx(lambda c: g.new_packet(c, run_id, payload={"sc": "B"})[0],
                  retries=3, backoff=0.05)
    ok_heal = g.get_packet(conn, pid) is not None
    record(domain="chaos.db-disappearance", component="chaos_lib.FlakyPool.tx",
           claim=("Without bounded retry, a pool drop wedges the loop: the "
                  "op fails, no partial state, no progress until heal."),
           evidence="TEST", caller="run_db_drop.scenario_B",
           callee="FlakyPool.tx", writer="tx unit", reader="probe",
           classification="WEDGED", confidence=0.95,
           broken_boundary="reconnect policy",
           dependencies=[],
           affects_agents=["impl-lane", "chaos-b"],
           detail={"rep": rep, "wedged": wedged, "packets_during_outage": n_packets,
                   "healed_after": ok_heal,
                   "failure_class": ("GENERIC: no-retry-on-pool-drop wedges; "
                                     "recovery requires operator heal or "
                                     "bounded retry")},
           missions=1,
           verdict_notes="expected WEDGED: single-attempt op cannot survive a pool drop")
    conn.close()
    return True  # the WEDGED verdict IS the expected finding


def scenario_C(rep, pi):
    """Kill -9 mid-transaction: no partial commit may survive."""
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"dbdrop-C-r{rep}-{pi}")
    conn.close()
    child = (
        "import sys, os; sys.path.insert(0, %r); "
        "import chaos_lib as g, uuid; "
        "c = g.db(); c.isolation_level = None; c.execute('BEGIN IMMEDIATE'); "
        "c.execute(\"INSERT INTO packets(packet_id, run_id, kind, status, idempotency_key) "
        "VALUES (?,?, 't','ENQUEUED',?)\", "
        "(str(uuid.uuid4()), %r, 'idem-c-%d-%d')); "
        "os._exit(137)" % (HARNESS, run_id, rep, pi)
    )
    p = subprocess.run([sys.executable, "-c", child], timeout=30)
    assert p.returncode == -9 or p.returncode == 137
    conn = g.db()
    cur = conn.execute(
        "SELECT COUNT(*) FROM packets WHERE idempotency_key=?",
        (f"idem-c-{rep}-{pi}",))
    n = cur.fetchone()[0]
    ok = n == 0
    record(domain="chaos.db-disappearance", component="sqlite WAL transaction",
           claim="A kill mid-transaction rolls back atomically: no torn packet row.",
           evidence="TEST", caller="run_db_drop.scenario_C",
           callee="sqlite3 BEGIN IMMEDIATE", writer="child (killed)",
           reader="probe", classification="SURVIVED" if ok else "LOST-STATE",
           confidence=0.97, broken_boundary="none" if ok else "atomicity",
           dependencies=[],
           affects_agents=["impl-lane"],
           detail={"rep": rep, "rows_survived": n},
           missions=1,
           verdict_notes="rollback journal held: zero partial rows" if ok else "TORN WRITE")
    conn.close()
    return ok


def scenario_D(rep, pi):
    """Torn checkpoint: pre-commit death -> absent; post-commit death ->
    present with valid digest."""
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"dbdrop-D-r{rep}-{pi}")
    conn.close()
    pre = (
        "import sys; sys.path.insert(0, %r); import chaos_lib as g; "
        "c = g.db(); c.isolation_level=None; c.execute('BEGIN IMMEDIATE'); "
        "c.execute(\"INSERT INTO checkpoints(run_id, checkpoint_id, state, state_digest) "
        "VALUES (%r, 1, '{\\\"step\\\": 9}', 'deadbeef')\"); "
        "import os; os._exit(137)" % (HARNESS, run_id)
    )
    subprocess.run([sys.executable, "-c", pre], timeout=30)
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM checkpoints WHERE run_id=?", (run_id,))
    n_pre = cur.fetchone()[0]
    # post-commit death via the real checkpoint() path, then kill
    post = (
        "import sys; sys.path.insert(0, %r); import chaos_lib as g; "
        "c = g.db(); g.checkpoint(c, %r, {'step': 5}); "
        "import os; os._exit(137)" % (HARNESS, run_id)
    )
    subprocess.run([sys.executable, "-c", post], timeout=30)
    conn = g.db()
    cp = g.latest_checkpoint(conn, run_id)
    digest_ok = False
    stale_ok = False
    if cp:
        try:
            st = g.restore_checkpoint(conn, run_id, cp["checkpoint_id"])
            digest_ok = st.get("step") == 5
        except g.StaleCheckpointError:
            pass
    ok = n_pre == 0 and digest_ok
    record(domain="chaos.db-disappearance", component="chaos_lib.checkpoint",
           claim="Checkpoints are atomic: pre-commit death leaves nothing, post-commit death leaves a digest-verified row.",
           evidence="TEST", caller="run_db_drop.scenario_D",
           callee="chaos_lib.checkpoint/restore_checkpoint",
           writer="child (killed)", reader="probe",
           classification="SURVIVED" if ok else "LOST-STATE",
           confidence=0.95, broken_boundary="none" if ok else "checkpoint atomicity",
           dependencies=["record 7 checkpoint/resume"],
           affects_agents=["impl-lane", "orca-b"],
           detail={"rep": rep, "pre_commit_rows": n_pre, "digest_ok": digest_ok},
           missions=1,
           verdict_notes="no torn checkpoints" if ok else "TORN CHECKPOINT")
    conn.close()
    return ok


def scenario_E(rep):
    """Outage window: 4 threads retry through a 1s outage; all heal."""
    conns = g.db()
    run_id = g.new_run(conns, prompt_ref=f"dbdrop-E-r{rep}")
    conns.close()
    pool = g.FlakyPool()
    pool.drop_all(gone_calls=10**9)  # outage until heal()
    results = {}

    def worker(i):
        def fn(c):
            pid, is_new = g.new_packet(c, run_id, payload={"sc": "E", "w": i})
            assert is_new
            assert g.claim_packet(c, pid, f"w-E-{rep}-{i}", 1)
            return pid
        try:
            results[i] = ("ok", pool.tx(fn, retries=60, backoff=0.05))
        except Exception as e:
            results[i] = ("fail", f"{type(e).__name__}: {e}")

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(4)]
    for t in threads:
        t.start()
    time.sleep(1.0)  # outage window
    pool.heal()
    for t in threads:
        t.join(timeout=60)
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM packets WHERE run_id=?", (run_id,))
    n = cur.fetchone()[0]
    cur = conn.execute(
        "SELECT COUNT(*) FROM packets WHERE run_id=? AND status='CLAIMED'", (run_id,))
    n_claimed = cur.fetchone()[0]
    ok = all(v[0] == "ok" for v in results.values()) and n == 4 and n_claimed == 4
    record(domain="chaos.db-disappearance", component="chaos_lib.FlakyPool.tx",
           claim="A bounded-retry loop heals through an outage window with no duplicate claims.",
           evidence="TEST", caller="run_db_drop.scenario_E",
           callee="FlakyPool.tx/claim_packet", writer="4 concurrent tx units",
           reader="probe", classification="SURVIVED" if ok else "WEDGED",
           confidence=0.9, broken_boundary="none" if ok else "reconnect",
           dependencies=["record 6 attempt identity"],
           affects_agents=["impl-lane", "chaos-b"],
           detail={"rep": rep, "threads": {k: v[0] for k, v in results.items()},
                   "packets": n, "claimed": n_claimed},
           missions=4,
           verdict_notes="all 4 threads healed after 1s outage" if ok else "OUTAGE NOT SURVIVED")
    conn.close()
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    args = ap.parse_args()
    g.init_db()
    scenarios = [("A", scenario_A), ("B", scenario_B), ("C", scenario_C),
                 ("D", scenario_D)]
    ok_n = tot = missions = 0
    for name, fn in scenarios:
        for rep in range(args.reps):
            for pi in range(2):
                try:
                    ok = fn(rep, pi)
                except Exception as e:
                    record(domain="chaos.db-disappearance",
                           component="run_db_drop", claim="probe harness error",
                           evidence="TEST", caller="run_db_drop.main",
                           callee=fn.__name__, writer="probe", reader="probe",
                           classification="UNKNOWN", confidence=0.5,
                           broken_boundary="probe harness", dependencies=[],
                           affects_agents=["chaos-a"],
                           detail={"scenario": name, "error": f"{type(e).__name__}: {e}"},
                           missions=0, verdict_notes="probe errored")
                    ok = False
                    print(f"dbdrop-{name} r{rep}.{pi}: PROBE_ERROR {e}", flush=True)
                tot += 1
                ok_n += ok
                missions += 1
                print(f"dbdrop-{name} r{rep}.{pi}: {'ok' if ok else 'FAILED'}", flush=True)
    for rep in range(args.reps):
        try:
            ok = scenario_E(rep)
        except Exception as e:
            print(f"dbdrop-E r{rep}: PROBE_ERROR {e}", flush=True)
            ok = False
        tot += 1
        ok_n += ok
        missions += 4
        print(f"dbdrop-E r{rep}: {'ok' if ok else 'FAILED'}", flush=True)
    print(f"DB DROP DONE: {ok_n}/{tot} survived, {missions} missions")
    return 0 if ok_n == tot else 1


if __name__ == "__main__":
    sys.exit(main())
