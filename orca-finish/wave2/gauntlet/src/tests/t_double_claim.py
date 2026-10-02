#!/usr/bin/env python3
"""T-DOUBLE-CLAIM: two workers race to claim one ENQUEUED packet.

The atomic claim (UPDATE ... WHERE status='ENQUEUED') must admit exactly one
runner. The loser must observe rowcount 0, never a second claim.
"""
import multiprocessing as mp
import sys

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g

HERE = "/home/nolan/ping-gauntlet/orca-gauntlet"


def racer(packet_id, worker_id, fencing, barrier, out_q):
    import gauntlet_lib as gg
    barrier.wait()  # release both racers at the same instant
    conn = gg.db()
    conn.autocommit = True
    won = gg.claim_packet(conn, packet_id, worker_id, fencing)
    out_q.put((worker_id, won))
    conn.close()


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-double-claim")
    packet = g.new_packet(conn, run, kind="race-packet")
    conn.close()

    barrier = mp.Barrier(3)
    out_q = mp.Queue()
    ps = [mp.Process(target=racer, args=(str(packet), f"racer-{i}", 100 + i, barrier, out_q))
          for i in (1, 2)]
    for p in ps:
        p.start()
    barrier.wait()  # release
    for p in ps:
        p.join(timeout=30)
    results = [out_q.get() for _ in ps]

    c2 = g.db()
    pkt = g.get_packet(c2, packet)
    winners = [w for w, won in results if won]
    evidence = {
        "race_results": results,
        "winners": winners,
        "exactly_one_winner": len(winners) == 1,
        "packet_claimed_by": pkt["claimed_by"],
        "packet_status": pkt["status"],
        "winner_matches_packet": pkt["claimed_by"] in winners,
    }
    ok = (len(winners) == 1 and pkt["status"] == "CLAIMED"
          and pkt["claimed_by"] in winners)
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
