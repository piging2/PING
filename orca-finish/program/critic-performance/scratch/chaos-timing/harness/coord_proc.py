#!/usr/bin/env python3
"""Killable synthetic coordinator for CHAOS-A (record 14).

--mode dispatch: advisory-lock claim, epoch bump, enqueue N packets stamped
  with the epoch, mark first IN_FLIGHT, then sleep (to be SIGKILled).
  --die-at: mid-claim (after lock, before epoch bump), mid-dispatch (after
  enqueue, before IN_FLIGHT), post-dispatch (after IN_FLIGHT, before sleep).
--mode recover: claim the lock (succeeds only after the dead coordinator's fd
  closed), bump the epoch, classify IN_FLIGHT/CLAIMED packets: dead holder
  (verified via kill(pid,0)) + stale epoch -> requeue ENQUEUED, attempt+1, new
  epoch. Live holder -> left alone. Also classifies timed-out tool calls
  (post-ack -> OUTCOME_UNKNOWN). Prints RECOVERED lines for grading.
--mode zombie: hold NO lock, attempt fenced writes with a stale epoch value
  captured earlier; every write must be rejected (rowcount 0).

Scratch DB only. Never production.
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g


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
    ap.add_argument("--mode", required=True,
                    choices=["dispatch", "recover", "zombie", "adopt"])
    ap.add_argument("--holder", required=True)
    ap.add_argument("--run-id", default="")
    ap.add_argument("--packets", type=int, default=2)
    ap.add_argument("--die-at", default="none",
                    choices=["none", "mid-claim", "mid-dispatch",
                             "post-dispatch"])
    ap.add_argument("--die-mode", default="kill",
                    choices=["kill", "term", "crash"])
    ap.add_argument("--stale-epoch", type=int, default=0)
    ap.add_argument("--target-packets", default="")
    args = ap.parse_args()

    conn = g.db()

    if args.mode == "zombie":
        rejected = 0
        attempted = 0
        for pid in args.target_packets.split(","):
            if not pid:
                continue
            attempted += 1
            if g.fenced_packet_write(conn, pid, args.stale_epoch,
                                    "SUCCEEDED") == 0:
                rejected += 1
        print(f"ZOMBIE attempted={attempted} rejected={rejected}", flush=True)
        return 0 if rejected == attempted else 7

    lock = g.CoordLock()
    if not lock.acquire():
        print("CLAIM_DENIED", flush=True)
        return 5
    print(f"CLAIM_HELD holder={args.holder}", flush=True)
    try:
        if args.die_at == "mid-claim":
            if args.die_mode == "kill":
                os._exit(137)
            elif args.die_mode == "crash":
                raise RuntimeError("coordinator crashed mid-claim")
            return 0

        if args.mode == "dispatch":
            epoch = g.coord_epoch_bump(conn)
            print(f"EPOCH {epoch}", flush=True)
            pids = []
            for k in range(args.packets):
                pid, _ = g.new_packet(
                    conn, args.run_id, kind=f"p{k+1}",
                    payload={"coordinator": args.holder})
                g.set_packet_epoch(conn, pid, epoch)
                pids.append(pid)
            print("PACKETS " + " ".join(pids), flush=True)
            if args.die_at == "mid-dispatch":
                if args.die_mode == "kill":
                    os._exit(137)
                elif args.die_mode == "crash":
                    raise RuntimeError("coordinator crashed mid-dispatch")
                return 0
            g.set_packet(conn, pids[0], "IN_FLIGHT")
            print(f"DISPATCHED {pids[0]} IN_FLIGHT", flush=True)
            if args.die_at == "post-dispatch":
                if args.die_mode == "kill":
                    os._exit(137)
                elif args.die_mode == "crash":
                    raise RuntimeError("coordinator crashed post-dispatch")
                return 0
            time.sleep(600)
            return 0

        # adopt mode: a new reign takes over durably-enqueued intent left by
        # a coordinator that died before its first write. Stamps the new
        # epoch; leaves packets ENQUEUED for workers to claim normally.
        if args.mode == "adopt":
            epoch = g.coord_epoch_bump(conn)
            print(f"EPOCH {epoch}", flush=True)
            cur = conn.execute(
                "SELECT packet_id FROM packets WHERE run_id=? AND status='ENQUEUED'",
                (args.run_id,))
            pids = [r[0] for r in cur.fetchall()]
            for pid in pids:
                g.set_packet_epoch(conn, pid, epoch)
            g.audit(conn, args.run_id, "coord.adopted",
                    {"packets": pids, "epoch": epoch, "holder": args.holder})
            print("ADOPTED " + " ".join(pids), flush=True)
            return 0

        # recover mode
        epoch = g.coord_epoch_bump(conn)
        print(f"EPOCH {epoch}", flush=True)
        cur = conn.execute(
            """SELECT packet_id, claimed_by, attempt_seq, coordinator_epoch, payload
               FROM packets WHERE run_id=? AND status IN ('IN_FLIGHT','CLAIMED')""",
            (args.run_id,))
        recovered = 0
        for packet_id, claimed_by, attempt_seq, pepoch, payload in cur.fetchall():
            wpid = (json.loads(payload) if payload else {}).get("worker_pid", 0)
            holder_dead = (not claimed_by) or (not wpid) or pid_dead(wpid)
            if pepoch < epoch and holder_dead:
                conn.execute(
                    """UPDATE packets SET status='ENQUEUED', attempt_seq=attempt_seq+1,
                              claimed_by=NULL, coordinator_epoch=?,
                              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
                       WHERE packet_id=? AND status IN ('IN_FLIGHT','CLAIMED')""",
                    (epoch, str(packet_id)))
                conn.commit()
                g.audit(conn, args.run_id, "coord.recovered",
                        {"packet": str(packet_id), "old_epoch": pepoch,
                         "new_epoch": epoch, "old_attempt": attempt_seq,
                         "old_holder": claimed_by})
                print(f"RECOVERED {packet_id} attempt {attempt_seq} -> {attempt_seq + 1}",
                      flush=True)
                recovered += 1
            else:
                print(f"LEFT_ALONE {packet_id} epoch={pepoch} holder={claimed_by}",
                      flush=True)
        # classify timed-out tool calls
        cur = conn.execute(
            "SELECT call_id FROM tool_calls WHERE run_id=? AND status='TIMED_OUT'"
            " AND outcome IS NULL", (args.run_id,))
        for (cid,) in cur.fetchall():
            g.tool_timeout(conn, cid)
        print(f"RECOVER_DONE recovered={recovered}", flush=True)
        return 0
    finally:
        lock.release()


if __name__ == "__main__":
    sys.exit(main())
