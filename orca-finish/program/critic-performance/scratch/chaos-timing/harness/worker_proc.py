#!/usr/bin/env python3
"""Killable synthetic worker for CHAOS-A.

Dispatch-stage die points (--die-at):
  S1  pre-claim                       (before the atomic claim)
  S2  post-claim pre-inflight         (claimed; before IN_FLIGHT marking)
  S3  mid-dispatch                    (IN_FLIGHT; before first effect)
  S4k post-effect k pre-checkpoint k  (effect k applied; checkpoint not written)
  S4kC post-checkpoint k              (checkpoint k written)
  S5  post-effects pre-complete       (all steps done; before completion emit)
  S6  mid-complete                    (completion emitted; before SUCCEEDED)
  S7  post-complete                   (after SUCCEEDED)

--die-mode: kill (os._exit, like SIGKILL: no cleanup), term (SIGTERM-style
  graceful: flush checkpoint, exit 0), crash (uncaught in-process exception),
  none.
--takeover-from: agent-driven rehydration (record 7): durable state only
  (run row + latest checkpoint), verify-death is the CALLER's job, reclaim and
  resume after the last checkpointed step.
--crash-at-step: raise mid-handle at that step (who reaps it? the internal
  supervisor below, modeling worker supervision: post-boundary -> the packet is
  classified OUTCOME_UNKNOWN, never blind-retried).

Scratch DB only. Never production.
"""
import argparse
import json
import os
import signal
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g

TERMINATE = False


def _on_term(signum, frame):
    global TERMINATE
    TERMINATE = True


def die(mode, conn, run_id, packet_id, worker_id, where):
    g.audit(conn, run_id, "worker.dying",
            {"worker": worker_id, "mode": mode, "at": where})
    conn.close()
    if mode == "kill":
        os._exit(137)          # SIGKILL: no cleanup, like the real thing
    elif mode == "term":
        sys.exit(0)            # graceful handled by caller via TERMINATE flag
    elif mode == "crash":
        raise RuntimeError(f"in-process exception injected at {where}")
    sys.exit(0)


def _parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--packet-id", required=True)
    ap.add_argument("--worker-id", required=True)
    ap.add_argument("--lease-id", required=True)
    ap.add_argument("--token", required=True)
    ap.add_argument("--steps", type=int, default=3)
    ap.add_argument("--step-seconds", type=float, default=0.15)
    ap.add_argument("--die-at", default="none")
    ap.add_argument("--die-mode", default="none",
                    choices=["none", "kill", "term", "crash"])
    ap.add_argument("--takeover-from", default=None)
    ap.add_argument("--fencing", type=int, default=1)
    ap.add_argument("--crash-at-step", type=int, default=0)
    ap.add_argument("--effect-mode", default="idem", choices=["idem", "plain"],
                    help="plain = counterfactual non-idempotent effects")
    return ap.parse_args()


def run(args):
    signal.signal(signal.SIGTERM, _on_term)

    conn = g.db()
    run_id, packet_id = args.run_id, args.packet_id

    if args.die_at == "S1" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S1")

    if args.takeover_from:
        run = g.get_run(conn, run_id)
        cp = g.latest_checkpoint(conn, run_id)
        g.audit(conn, run_id, "worker.rehydrated",
                {"worker": args.worker_id,
                 "took_over_from": args.takeover_from,
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

    if args.die_at == "S2" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S2")

    g.set_packet(conn, packet_id, "IN_FLIGHT")
    g.audit(conn, run_id, "worker.inflight", {"worker": args.worker_id})

    if args.die_at == "S3" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S3")

    for i in range(start, args.steps + 1):
        if TERMINATE:  # graceful SIGTERM: flush checkpoint, exit resumable
            g.checkpoint(conn, run_id,
                         {"step": i - 1, "worker": args.worker_id,
                          "terminated": True})
            g.audit(conn, run_id, "worker.terminated_graceful",
                    {"worker": args.worker_id, "at_step": i})
            print(f"TERMINATED_GRACEFUL at step {i}", flush=True)
            return 0
        if not g.lease_valid(conn, args.lease_id, args.token):
            g.audit(conn, run_id, "worker.lease_invalid_stop",
                    {"worker": args.worker_id, "at_step": i})
            g.set_packet(conn, packet_id, "OUTCOME_UNKNOWN")
            print(f"LEASE_INVALID_STOP at step {i}", flush=True)
            return 2
        if args.crash_at_step == i:
            raise RuntimeError(f"in-process exception mid-handle at step {i}")
        # The durable side effect: idempotent apply (or the plain
        # counterfactual), then checkpoint.
        if args.effect_mode == "plain":
            applied = g.apply_effect_plain(conn, packet_id, i, args.worker_id)
        else:
            applied = g.apply_effect(conn, packet_id, i, args.worker_id)
        g.audit(conn, run_id, "effect.step",
                {"worker": args.worker_id, "step": i, "packet": packet_id,
                 "applied": applied})
        if args.die_at == f"S4{i}" and args.die_mode != "none":
            die(args.die_mode, conn, run_id, packet_id, args.worker_id,
                f"S4{i}")
        g.checkpoint(conn, run_id, {"step": i, "worker": args.worker_id})
        if args.die_at == f"S4{i}C" and args.die_mode != "none":
            die(args.die_mode, conn, run_id, packet_id, args.worker_id,
                f"S4{i}C")
        print(f"step {i} done applied={applied}", flush=True)
        time.sleep(args.step_seconds)

    if args.die_at == "S5" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S5")

    emitted = g.emit_completion(conn, run_id, packet_id,
                               result_ref=f"sha256:steps-{args.steps}")

    if args.die_at == "S6" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S6")

    g.set_packet(conn, packet_id, "SUCCEEDED",
                 result_ref=f"sha256:steps-{args.steps}")
    g.set_run_status(conn, run_id, "COMPLETED")

    if args.die_at == "S7" and args.die_mode != "none":
        die(args.die_mode, conn, run_id, packet_id, args.worker_id, "S7")

    print(f"WORKER_DONE emitted={emitted}", flush=True)
    return 0


def supervise():
    """Internal supervisor: reaps in-process worker exceptions. Answers the
    probe question 'who reaps it': the supervisor does, and the journal
    records the reap under the run."""
    args = _parse_args()
    try:
        return run(args)
    except SystemExit as e:
        return e.code or 0
    except Exception as e:
        try:
            conn = g.db()
            g.audit(conn, args.run_id, "worker.exception_reaped",
                    {"worker": args.worker_id, "packet": args.packet_id,
                     "error": f"{type(e).__name__}: {e}"})
            conn.close()
        except Exception:
            pass
        print(f"SUPERVISOR_REAPED {type(e).__name__}: {e}", flush=True)
        return 99


if __name__ == "__main__":
    sys.exit(supervise())
