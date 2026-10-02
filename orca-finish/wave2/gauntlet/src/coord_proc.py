#!/usr/bin/env python3
"""Killable synthetic coordinator for the gauntlet (record 14).

--mode dispatch: claims the advisory-lock coordinator claim, bumps the epoch,
  enqueues 3 packets stamped with the epoch, marks p1 IN_FLIGHT (mid-dispatch),
  then sleeps (to be SIGKILled by the test).
--mode recover: claims the advisory lock (succeeds only after the dead
  coordinator's session dropped), bumps the epoch, and requeues IN_FLIGHT
  packets stamped with a stale epoch whose worker pid is dead: ENQUEUED with
  attempt_seq+1 and the new epoch (atomic-claim recovery). Prints RECOVERED
  lines for the test to grade.

Never touches production. Scratch DB only.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def pid_dead(pid):
    try:
        os.kill(pid, 0)
        return False
    except ProcessLookupError:
        return True
    except PermissionError:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["dispatch", "recover"])
    ap.add_argument("--holder", required=True)
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--worker-pid", type=int, default=0)
    args = ap.parse_args()

    conn = g.db()
    conn.autocommit = True
    if not g.coord_claim(conn):
        print("CLAIM_DENIED", flush=True)
        return 5
    print(f"CLAIM_HELD holder={args.holder}", flush=True)

    if args.mode == "dispatch":
        epoch = g.coord_epoch_bump(conn)
        print(f"EPOCH {epoch}", flush=True)
        pids = []
        for k in ("p1", "p2", "p3"):
            pid = g.new_packet(conn, args.run_id, kind=k, effect_class="TRANSACTIONAL",
                               payload={"worker_pid": args.worker_pid})
            g.set_packet_epoch(conn, pid, epoch)
            pids.append(str(pid))
        print("PACKETS " + " ".join(pids), flush=True)
        # mid-dispatch: p1 goes IN_FLIGHT, then we sleep to be killed
        g.set_packet(conn, pids[0], "IN_FLIGHT")
        print(f"DISPATCHED {pids[0]} IN_FLIGHT", flush=True)
        time.sleep(600)
        return 0

    # recover mode
    epoch = g.coord_epoch_bump(conn)
    print(f"EPOCH {epoch}", flush=True)
    cur = conn.execute(
        """SELECT packet_id, claimed_by, attempt_seq, coordinator_epoch, payload
           FROM gauntlet.packets WHERE run_id=%s AND status='IN_FLIGHT'""",
        (args.run_id,))
    for packet_id, claimed_by, attempt_seq, pepoch, payload in cur.fetchall():
        wpid = (payload or {}).get("worker_pid", 0)
        if pepoch < epoch and (not wpid or pid_dead(wpid)):
            conn.execute(
                """UPDATE gauntlet.packets SET status='ENQUEUED', attempt_seq=attempt_seq+1,
                          coordinator_epoch=%s, updated_at=now()
                   WHERE packet_id=%s AND status='IN_FLIGHT'""",
                (epoch, str(packet_id)))
            g.audit(conn, args.run_id, "coord.recovered",
                    {"packet": str(packet_id), "old_epoch": pepoch,
                     "new_epoch": epoch, "old_attempt": attempt_seq})
            print(f"RECOVERED {packet_id} attempt {attempt_seq} -> {attempt_seq + 1}",
                  flush=True)
        else:
            print(f"LEFT_ALONE {packet_id} epoch={pepoch} worker_pid={wpid}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
