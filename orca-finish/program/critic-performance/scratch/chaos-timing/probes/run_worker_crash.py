#!/usr/bin/env python3
"""CHAOS-A worker crash: in-process exception mid-handle.

Probe questions: who reaps it? what do the lease/journal say?

For each (crash_step in 1..3, rep):
  1. fresh run + lease + packet; spawn worker with --crash-at-step K
  2. expect rc=99 and SUPERVISOR_REAPED on stdout: the internal supervisor
     reaps the exception (models worker supervision), it never escapes to
     the coordinator as a fake success.
  3. classify from durable state alone (record 8):
       crash at step 1 -> 0 effects applied -> pre-boundary -> FAILED,
       safe to requeue with a fresh full run.
       crash at step 2/3 -> effects applied -> post-boundary ->
       OUTCOME_UNKNOWN, never blind-retried; recovery = takeover resume
       from latest checkpoint with idempotent effect keys.
  4. grade exactly-once: effects 1..N once each, one completion, SUCCEEDED.
  5. journal/lease assertions: audit holds worker.exception_reaped +
     effect.step events; the lease itself survives the crash (valid), because
     the crash invalidates the worker, not the grant.

Counterfactual (the generic failure class, proven by construction):
  effect-mode plain (non-idempotent effects) + crash at step 2 + naive
  fresh re-run -> effects duplicated -> DUPLICATED verdict. This is what
  happens WITHOUT the idempotent-effect-key mechanism.
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g
from record import record

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "harness")
WORKER = os.path.join(HARNESS, "worker_proc.py")
STEPS = 3


def spawn(args):
    return subprocess.Popen([sys.executable, WORKER] + args,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True)


def wait_dead(proc, timeout=30):
    try:
        return proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        return proc.wait(timeout=10)


def grade(conn, run_id, packet_id):
    n_eff, n_steps = g.count_effects(conn, packet_id)
    n_comp = g.count_completions(conn, packet_id)
    pkt = g.get_packet(conn, packet_id)
    run = g.get_run(conn, run_id)
    ok = (n_eff == STEPS and n_steps == STEPS and n_comp == 1
          and pkt["status"] == "SUCCEEDED" and run["status"] == "COMPLETED")
    return ok, {"effects": n_eff, "distinct_steps": n_steps,
                "completions": n_comp, "packet": pkt["status"],
                "run": run["status"]}


def one_probe(crash_step, rep, effect_mode="idem", naive_retry=False):
    conn = g.db()
    tag = f"crash-s{crash_step}-{effect_mode}-r{rep}"
    run_id = g.new_run(conn, prompt_ref=tag)
    lease_id = f"lease-{run_id[:8]}"
    token = g.lease_issue(conn, lease_id, "worker-orig", 600)
    packet_id, _ = g.new_packet(conn, run_id, payload={"probe": tag})
    worker = f"w-crash-{crash_step}-{rep}"
    detail = {"crash_step": crash_step, "effect_mode": effect_mode, "rep": rep}

    w = spawn(["--run-id", run_id, "--packet-id", packet_id,
               "--worker-id", worker, "--lease-id", lease_id, "--token", token,
               "--steps", str(STEPS), "--step-seconds", "0.05",
               "--crash-at-step", str(crash_step),
               "--effect-mode", effect_mode])
    out = w.communicate(timeout=30)[0]
    rc = w.returncode
    detail["rc"] = rc
    detail["reaped"] = "SUPERVISOR_REAPED" in out
    assert rc == 99 and "SUPERVISOR_REAPED" in out, f"supervisor did not reap: {out[-300:]}"

    # lease/journal state right after the crash
    detail["lease_still_valid"] = g.lease_valid(conn, lease_id, token)
    detail["reap_audits"] = g.count_audit(conn, run_id, "worker.exception_reaped")
    detail["effect_audits"] = g.count_audit(conn, run_id, "effect.step")
    n_eff_before, _ = g.count_effects(conn, packet_id)
    detail["effects_before_recovery"] = n_eff_before

    # record-8 classification from durable state alone. The classification is
    # a durable audit record; the packet row stays IN_FLIGHT until an
    # explicit recovery decision resolves it (never an automatic resume).
    if n_eff_before == 0:
        classification = "FAILED"
        decision = "safe-requeue: pre-boundary, no effect applied"
    else:
        classification = "OUTCOME_UNKNOWN"
        decision = ("idempotent-resume: post-boundary, effects applied; "
                    "resume from checkpoint with idempotent keys only")
    g.audit(conn, run_id, "crash.classified",
            {"classification": classification, "decision": decision,
             "effects_seen": n_eff_before})
    detail["classification"] = classification
    detail["decision"] = decision

    if naive_retry:
        # the failure class, deliberately: naive requeue (no idempotency),
        # fresh full re-run with plain effects -> must duplicate
        g.audit(conn, run_id, "crash.naive_requeue",
                {"note": "counterfactual: requeue without idempotent keys"})
        g.set_packet(conn, packet_id, "ENQUEUED")
        w2 = spawn(["--run-id", run_id, "--packet-id", packet_id,
                    "--worker-id", worker + "-naive", "--lease-id", lease_id,
                    "--token", token, "--steps", str(STEPS),
                    "--step-seconds", "0.05", "--effect-mode", "plain"])
        rc2 = wait_dead(w2)
        detail["naive_rc"] = rc2
        n_eff, n_steps = g.count_effects(conn, packet_id)
        detail["effects_after_naive"] = n_eff
        verdict = "DUPLICATED" if n_eff > STEPS else "SURVIVED"
        detail["failure_class"] = ("GENERIC: crash-recovery without idempotent "
                                   "effect keys duplicates side effects")
    elif classification == "FAILED":
        g.set_packet(conn, packet_id, "ENQUEUED")
        w2 = spawn(["--run-id", run_id, "--packet-id", packet_id,
                    "--worker-id", worker + "-r2", "--lease-id", lease_id,
                    "--token", token, "--steps", str(STEPS),
                    "--step-seconds", "0.05", "--effect-mode", effect_mode])
        rc2 = wait_dead(w2)
        detail["recovery_rc"] = rc2
        ok, gd = grade(conn, run_id, packet_id)
        detail.update(gd)
        verdict = "SURVIVED" if ok else "DUPLICATED"
    else:
        w2 = spawn(["--run-id", run_id, "--packet-id", packet_id,
                    "--worker-id", worker + "-r2", "--lease-id", lease_id,
                    "--token", token, "--steps", str(STEPS),
                    "--step-seconds", "0.05", "--takeover-from", worker,
                    "--fencing", "2", "--effect-mode", effect_mode])
        rc2 = wait_dead(w2)
        detail["recovery_rc"] = rc2
        ok, gd = grade(conn, run_id, packet_id)
        detail.update(gd)
        verdict = "SURVIVED" if ok else "DUPLICATED"

    record(
        domain="chaos.worker-crash",
        component="worker_proc.supervise / chaos_lib.apply_effect",
        claim=("Record 8 + worker supervision: an in-process exception "
               "mid-handle is reaped by the supervisor, classified "
               "pre/post side-effect boundary, and recovered without "
               "duplicate delegation iff effect keys are idempotent."),
        evidence="TEST",
        caller="run_worker_crash.one_probe",
        callee="worker_proc.supervise/apply_effect(_plain)",
        writer="worker_proc (crashed) + recovery worker",
        reader="probe classifier (durable state only)",
        classification=verdict,
        confidence=0.93,
        broken_boundary=("none" if verdict == "SURVIVED"
                         else "idempotent effect application"),
        dependencies=["record 7 checkpoint/resume", "record 8 UNKNOWN outcomes",
                      "record 10 capability gates (lease)"],
        affects_agents=["impl-lane", "orca-b"],
        detail=detail,
        missions=1,
        verdict_notes=("supervisor reaped the exception; lease survived the "
                       "crash; journal holds the reap + classification; "
                       "explicit recovery completed exactly once"
                       if verdict == "SURVIVED" else
                       "COUNTERFACTUAL PROVEN: naive requeue without idempotent "
                       "effect keys duplicates side effects"))
    conn.close()
    return verdict == "SURVIVED"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=4)
    args = ap.parse_args()
    g.init_db()
    ok_n = tot = 0
    for step in (1, 2, 3):
        for rep in range(args.reps):
            try:
                ok = one_probe(step, rep)
            except Exception as e:
                record(domain="chaos.worker-crash", component="run_worker_crash",
                       claim="probe harness error", evidence="TEST",
                       caller="run_worker_crash.main", callee="one_probe",
                       writer="probe", reader="probe", classification="UNKNOWN",
                       confidence=0.5, broken_boundary="probe harness",
                       dependencies=[], affects_agents=["chaos-a"],
                       detail={"error": f"{type(e).__name__}: {e}"}, missions=0,
                       verdict_notes="probe errored")
                ok = False
                print(f"crash@{step} r{rep}: PROBE_ERROR {e}", flush=True)
            tot += 1
            ok_n += ok
            print(f"crash@{step} r{rep}: {'SURVIVED' if ok else 'FAILED'}", flush=True)
    # counterfactuals: prove the generic class
    for rep in range(2):
        try:
            one_probe(2, rep, effect_mode="plain", naive_retry=True)
            print(f"counterfactual r{rep}: recorded (expect DUPLICATED)", flush=True)
        except Exception as e:
            print(f"counterfactual r{rep}: PROBE_ERROR {e}", flush=True)
    print(f"WORKER CRASH DONE: {ok_n}/{tot} survived")
    return 0 if ok_n == tot else 1


if __name__ == "__main__":
    sys.exit(main())
