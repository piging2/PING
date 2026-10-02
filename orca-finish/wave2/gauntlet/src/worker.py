#!/usr/bin/env python3
"""Killable synthetic worker for the gauntlet.

Claims (or takes over) one packet, then runs N steps. Each step:
  1. lease check (fail closed on invalid lease)
  2. append exactly one durable effect record (audit event)
  3. write a monotonic checkpoint
On --takeover-from, the worker first rehydrates from durable state alone
(run row + latest checkpoint), verifies the old holder is dead is the CALLER's
job (the test proves death before spawning); here it reclaims and resumes
after the last checkpointed step.

Never touches production. Scratch DB only.
"""
import argparse
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--packet-id", required=True)
    ap.add_argument("--worker-id", required=True)
    ap.add_argument("--lease-id", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--steps", type=int, default=5)
    ap.add_argument("--step-seconds", type=float, default=1.0)
    ap.add_argument("--takeover-from", default=None)
    ap.add_argument("--fencing", type=int, default=1)
    args = ap.parse_args()

    conn = g.db()
    conn.autocommit = True
    run_id, packet_id = args.run_id, args.packet_id

    if args.takeover_from:
        # Agent-driven rehydration (record 7 / O-6 pattern): durable state only.
        run = g.get_run(conn, run_id)
        cp = g.latest_checkpoint(conn, run_id)
        g.audit(conn, run_id, "worker.rehydrated", {
            "worker": args.worker_id, "took_over_from": args.takeover_from,
            "run_status": run["status"] if run else None,
            "checkpoint_id": cp["checkpoint_id"] if cp else None,
            "checkpoint_state": cp["state"] if cp else None})
        ok = g.reclaim_packet(conn, packet_id, args.takeover_from,
                             args.worker_id, args.fencing)
        if not ok:
            g.audit(conn, run_id, "worker.reclaim_failed",
                    {"worker": args.worker_id})
            print("RECLAIM_FAILED", flush=True)
            return 4
        start = (cp["state"].get("step", 0) if cp else 0) + 1
    else:
        if not g.claim_packet(conn, packet_id, args.worker_id, args.fencing):
            print("CLAIM_LOST", flush=True)
            return 3
        g.audit(conn, run_id, "worker.claimed",
                {"worker": args.worker_id, "packet": packet_id})
        start = 1

    g.set_packet(conn, packet_id, "IN_FLIGHT")
    for i in range(start, args.steps + 1):
        if not g.lease_valid(conn, args.lease_id, args.token):
            g.audit(conn, run_id, "worker.lease_invalid_stop",
                    {"worker": args.worker_id, "at_step": i})
            print(f"LEASE_INVALID_STOP at step {i}", flush=True)
            return 2
        # The durable side effect: exactly one append-only record per step.
        g.audit(conn, run_id, "effect.step",
                {"worker": args.worker_id, "step": i, "packet": packet_id})
        g.checkpoint(conn, run_id, {"step": i, "worker": args.worker_id})
        print(f"step {i} done", flush=True)
        time.sleep(args.step_seconds)

    g.set_packet(conn, packet_id, "SUCCEEDED", result_ref=f"sha256:steps-{args.steps}")
    g.set_run_status(conn, run_id, "COMPLETED")
    print("WORKER_DONE", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
