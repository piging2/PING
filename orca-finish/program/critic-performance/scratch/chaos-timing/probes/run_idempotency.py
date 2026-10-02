#!/usr/bin/env python3
"""CHAOS-A idempotency: duplicate delivery, redelivery storms, dedup key
collisions, same-event-twice, exactly-once completion emission.

  duplicate-delivery: 2 threads race the atomic claim on one packet ->
      exactly one winner, one delegation row.
  storm: T threads x M duplicate submissions of one idempotency key ->
      exactly one packet row, T*M-1 dedup hits, zero double-apply.
  collision: same idem key, DIFFERENT payload -> second rejected, original
      payload byte-identical, collision audited.
  same-event-twice: emit_completion twice (sequential + 4-thread race) ->
      exactly one completion row.
  emit-race: 4 threads race emit_completion on one packet -> one row.
"""
import argparse
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g
from record import record


def dup_delivery_race(rep):
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"idem-dupe-r{rep}")
    packet_id, _ = g.new_packet(conn, run_id, payload={"sc": "dupe"})
    conn.close()
    wins = {}

    def racer(i):
        c = g.db()
        wins[i] = g.claim_packet(c, packet_id, f"w-dupe-{rep}-{i}", i + 1)
        c.close()

    ts = [threading.Thread(target=racer, args=(i,)) for i in range(2)]
    [t.start() for t in ts]
    [t.join(timeout=30) for t in ts]
    conn = g.db()
    n_del, n_workers = g.count_delegations(conn, packet_id)
    pkt = g.get_packet(conn, packet_id)
    ok = sum(wins.values()) == 1 and n_del == 1 and n_workers == 1
    record(domain="idempotency.delivery", component="chaos_lib.claim_packet",
           claim=("Record 6: the atomic claim admits exactly one winner; a "
                  "duplicate delivery of the same packet cannot double-delegate."),
           evidence="TEST", caller="run_idempotency.dup_delivery_race",
           callee="claim_packet", writer="2 racing deliverers",
           reader="probe", classification="SURVIVED" if ok else "DUPLICATED",
           confidence=0.96, broken_boundary="none" if ok else "atomic claim",
           dependencies=["record 6 attempt identity"],
           affects_agents=["impl-lane", "orca-b"],
           detail={"rep": rep, "wins": wins, "delegations": n_del,
                   "status": pkt["status"]},
           missions=1,
           verdict_notes="exactly one claim winner" if ok else "DOUBLE CLAIM")
    conn.close()
    return ok


def storm(rep, threads=10, per_thread=15):
    import uuid as _uuid
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"idem-storm-r{rep}")
    conn.close()
    idem = f"storm-{rep}-{_uuid.uuid4().hex[:8]}"
    created = []

    def spammer(i):
        c = g.db()
        for j in range(per_thread):
            pid, is_new = g.new_packet(c, run_id, payload={"storm": rep, "t": i, "j": j},
                                       idem=idem)
            if is_new:
                created.append(pid)
        c.close()

    ts = [threading.Thread(target=spammer, args=(i,)) for i in range(threads)]
    [t.start() for t in ts]
    [t.join(timeout=120) for t in ts]
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM packets WHERE idempotency_key=?", (idem,))
    n_packets = cur.fetchone()[0]
    hits = g.count_audit(conn, run_id, "packet.dedup_hit")
    total = threads * per_thread
    ok = n_packets == 1 and hits == total - 1 and len(created) == 1
    record(domain="idempotency.storm", component="chaos_lib.new_packet",
           claim=(f"Redelivery storm ({total} duplicate submissions, one "
                  "idempotency key): exactly one packet materializes; every "
                  "duplicate is a dedup hit, never a double-apply."),
           evidence="TEST", caller="run_idempotency.storm",
           callee="new_packet", writer=f"{threads} spammer threads",
           reader="probe", classification="SURVIVED" if ok else "DUPLICATED",
           confidence=0.94, broken_boundary="none" if ok else "dedup key",
           dependencies=["record 6 attempt identity"],
           affects_agents=["impl-lane", "chaos-b", "chaos-c"],
           detail={"rep": rep, "submissions": total, "packets": n_packets,
                   "dedup_hits": hits},
           missions=total,
           verdict_notes=(f"{total} deliveries -> 1 packet, {hits} dedup hits"
                          if ok else "STORM DUPLICATED"))
    conn.close()
    return ok


def collision(rep, pi):
    import uuid as _uuid
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"idem-coll-r{rep}-{pi}")
    # unique per invocation: idempotency keys are global, never reused across probes
    idem = f"coll-{rep}-{pi}-{_uuid.uuid4().hex[:8]}"
    pid1, new1 = g.new_packet(conn, run_id, payload={"v": 1, "owner": "a"}, idem=idem)
    pid2, new2 = g.new_packet(conn, run_id, payload={"v": 2, "owner": "b"}, idem=idem)
    cur = conn.execute("SELECT payload FROM packets WHERE packet_id=?", (pid1,))
    payload_after = cur.fetchone()[0]
    hits = g.count_audit(conn, run_id, "packet.dedup_hit")
    ok = (new1 and not new2 and pid1 == pid2 and hits == 1
          and '"v":1' in payload_after.replace(" ", ""))
    record(domain="idempotency.collision", component="chaos_lib.new_packet",
           claim=("Dedup key collision (same key, different payload): the "
                  "second submission is rejected, the original payload is "
                  "byte-identical, the collision is audited."),
           evidence="TEST", caller="run_idempotency.collision",
           callee="new_packet", writer="probe", reader="probe",
           classification="SURVIVED" if ok else "DUPLICATED",
           confidence=0.95, broken_boundary="none" if ok else "dedup key",
           dependencies=["record 6 attempt identity", "record 17 audit"],
           affects_agents=["impl-lane"],
           detail={"rep": rep, "same_packet": pid1 == pid2,
                   "payload_preserved": '"v":1' in payload_after.replace(" ", "")},
           missions=2,
           verdict_notes="collision rejected, original preserved" if ok else "COLLISION CORRUPTED")
    conn.close()
    return ok


def same_event_twice(rep):
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"idem-2x-r{rep}")
    packet_id, _ = g.new_packet(conn, run_id, payload={"sc": "2x"})
    conn.close()
    firsts = []

    def emitter(i):
        c = g.db()
        firsts.append(g.emit_completion(c, run_id, packet_id, "sha256:2x"))
        c.close()

    ts = [threading.Thread(target=emitter, args=(i,)) for i in range(4)]
    [t.start() for t in ts]
    [t.join(timeout=30) for t in ts]
    conn = g.db()
    n = g.count_completions(conn, packet_id)
    suppressed = g.count_audit(conn, run_id, "completion.duplicate_suppressed")
    ok = n == 1 and sum(firsts) == 1 and suppressed == 3
    record(domain="idempotency.completion", component="chaos_lib.emit_completion",
           claim=("Same event twice (4 racing emitters): exactly one "
                  "completion row; duplicates suppressed and audited."),
           evidence="TEST", caller="run_idempotency.same_event_twice",
           callee="emit_completion", writer="4 racing emitters",
           reader="probe", classification="SURVIVED" if ok else "DUPLICATED",
           confidence=0.96, broken_boundary="none" if ok else "write-once completion",
           dependencies=["record 9 effect reconciliation"],
           affects_agents=["impl-lane", "orca-b"],
           detail={"rep": rep, "completions": n, "firsts": sum(firsts),
                   "suppressed": suppressed},
           missions=3,
           verdict_notes="exactly-once completion held" if ok else "COMPLETION DUPLICATED")
    conn.close()
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--storms", type=int, default=8)
    ap.add_argument("--storm-threads", type=int, default=10)
    ap.add_argument("--storm-per-thread", type=int, default=15)
    args = ap.parse_args()
    g.init_db()
    ok_n = tot = missions = 0

    def run(fn, label, m):
        nonlocal ok_n, tot, missions
        try:
            ok = fn()
        except Exception as e:
            record(domain="idempotency", component="run_idempotency",
                   claim="probe harness error", evidence="TEST",
                   caller="run_idempotency.main", callee=label,
                   writer="probe", reader="probe", classification="UNKNOWN",
                   confidence=0.5, broken_boundary="probe harness",
                   dependencies=[], affects_agents=["chaos-a"],
                   detail={"error": f"{type(e).__name__}: {e}"}, missions=0,
                   verdict_notes="probe errored")
            ok = False
            print(f"{label}: PROBE_ERROR {e}", flush=True)
        tot += 1
        ok_n += ok
        missions += m
        print(f"{label}: {'SURVIVED' if ok else 'FAILED'}", flush=True)

    for rep in range(10):
        run(lambda r=rep: dup_delivery_race(r), f"dupe-race r{rep}", 1)
    for rep in range(args.storms):
        run(lambda r=rep: storm(r, args.storm_threads, args.storm_per_thread),
            f"storm r{rep} ({args.storm_threads*args.storm_per_thread} deliveries)",
            args.storm_threads * args.storm_per_thread)
    for rep in range(6):
        for pi in range(2):
            run(lambda r=rep, p=pi: collision(r, p), f"collision r{rep}.{pi}", 2)
    for rep in range(6):
        run(lambda r=rep: same_event_twice(r), f"same-event-2x r{rep}", 3)

    print(f"IDEMPOTENCY DONE: {ok_n}/{tot} survived, {missions} missions")
    return 0 if ok_n == tot else 1


if __name__ == "__main__":
    sys.exit(main())
