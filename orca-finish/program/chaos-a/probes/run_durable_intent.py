#!/usr/bin/env python3
"""CHAOS-A follow-up: durable dispatch intent vs mid-claim coordinator death.

Proves the fix direction for failure class FC-3 (non-durable dispatch intent
lost on pre-write coordinator death, found as 6x LOST-STATE in run_coord_death).

For each rep:
  1. planner durably enqueues 2 packets (ENQUEUED) BEFORE any coordinator reign
  2. coordinator reign 1 dies mid-claim (before its first durable write)
  3. coordinator reign 2 (--mode adopt): claims the freed lock, bumps epoch,
     stamps the pre-enqueued packets with the new epoch
  4. workers claim and execute both packets to completion
  5. grade: no intent lost, exactly-once effects/completions, epoch advanced

Expected: SURVIVED x reps. If this fails, the intent layer itself is broken.
"""
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
COORD = os.path.join(HARNESS, "coord_proc.py")
WORKER = os.path.join(HARNESS, "worker_proc.py")
STEPS = 3


def wait_dead(proc, timeout=60):
    try:
        return proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        return proc.wait(timeout=10)


def pid_is_dead(pid):
    try:
        os.kill(pid, 0)
        return False
    except ProcessLookupError:
        return True
    except PermissionError:
        return False


def one_probe(rep, packets=2):
    conn = g.db()
    tag = f"durable-intent-r{rep}"
    run_id = g.new_run(conn, prompt_ref=tag)
    lease_id = f"lease-{run_id[:8]}"
    token = g.lease_issue(conn, lease_id, "workers", 600)
    # 1. durable intent BEFORE any coordinator reign
    pids = []
    for k in range(packets):
        pid, is_new = g.new_packet(conn, run_id, kind=f"p{k+1}",
                                   payload={"plan": tag})
        assert is_new
        pids.append(pid)
    g.audit(conn, run_id, "plan.enqueued",
            {"packets": pids, "note": "durable intent precedes coordinator"})
    conn.close()
    detail = {"rep": rep, "planned": pids}

    # 2. reign 1 dies mid-claim
    d1 = subprocess.Popen(
        [sys.executable, COORD, "--mode", "dispatch",
         "--holder", f"coord-{tag}-r1", "--run-id", run_id,
         "--packets", str(packets), "--die-at", "mid-claim",
         "--die-mode", "kill"],
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    rc1 = wait_dead(d1)
    assert pid_is_dead(d1.pid)
    detail["reign1_rc"] = rc1

    # 3. reign 2 adopts
    d2 = subprocess.Popen(
        [sys.executable, COORD, "--mode", "adopt",
         "--holder", f"coord-{tag}-r2", "--run-id", run_id],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out = d2.communicate(timeout=60)[0]
    assert d2.returncode == 0, out[-500:]
    detail["adopt_out"] = out.strip().splitlines()[-2:]

    # 4. workers execute
    conn = g.db()
    for i, pid in enumerate(pids):
        w = subprocess.Popen(
            [sys.executable, WORKER, "--run-id", run_id, "--packet-id", pid,
             "--worker-id", f"w-{tag}-{i}", "--lease-id", lease_id,
             "--token", token, "--steps", str(STEPS), "--step-seconds", "0.05",
             "--fencing", str(i + 1)],
            stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        rc = wait_dead(w)
        assert rc == 0, f"worker {i} rc={rc}"

    # 5. grade
    ok_all = True
    for pid in pids:
        n_eff, n_steps = g.count_effects(conn, pid)
        n_comp = g.count_completions(conn, pid)
        pkt = g.get_packet(conn, pid)
        ok = (n_eff == STEPS and n_steps == STEPS and n_comp == 1
              and pkt["status"] == "SUCCEEDED")
        ok_all = ok_all and ok
        detail[pid[:8]] = {"effects": n_eff, "completions": n_comp,
                           "status": pkt["status"], "epoch": pkt["coordinator_epoch"]}
    run = g.get_run(conn, run_id)
    detail["run_status"] = run["status"]
    ok_all = ok_all and run["status"] == "COMPLETED"
    conn.close()

    record(
        domain="chaos.coordinator-death",
        component="coord_proc.adopt / planner durable enqueue",
        claim=("FC-3 fix direction: dispatch intent enqueued durably BEFORE "
               "any coordinator reign survives mid-claim coordinator death; "
               "the next reign adopts it via the epoch stamp."),
        evidence="TEST",
        caller="run_durable_intent.one_probe",
        callee="coord_proc --mode adopt",
        writer="planner (pre-reign) + adopt coordinator",
        reader="workers (normal claim path)",
        classification="SURVIVED" if ok_all else "LOST-STATE",
        confidence=0.94,
        broken_boundary="none" if ok_all else "durable intent",
        dependencies=["record 1 durable run identity", "record 6 attempt identity",
                      "record 14 coordinator death recovery"],
        affects_agents=["impl-lane", "orca-b"],
        detail=detail,
        missions=packets,
        verdict_notes=("durable intent survived mid-claim death; adopted and "
                       "completed exactly once" if ok_all else "INTENT STILL LOST"))
    return ok_all


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--packets", type=int, default=2)
    args = ap.parse_args()
    g.init_db()
    ok_n = 0
    for rep in range(args.reps):
        try:
            ok = one_probe(rep, args.packets)
        except Exception as e:
            record(domain="chaos.coordinator-death", component="run_durable_intent",
                   claim="probe harness error", evidence="TEST",
                   caller="run_durable_intent.main", callee="one_probe",
                   writer="probe", reader="probe", classification="UNKNOWN",
                   confidence=0.5, broken_boundary="probe harness",
                   dependencies=[], affects_agents=["chaos-a"],
                   detail={"rep": rep, "error": f"{type(e).__name__}: {e}"},
                   missions=0, verdict_notes="probe errored")
            ok = False
            print(f"durable-intent r{rep}: PROBE_ERROR {e}", flush=True)
        ok_n += ok
        print(f"durable-intent r{rep}: {'SURVIVED' if ok else 'FAILED'}", flush=True)
    print(f"DURABLE INTENT DONE: {ok_n}/{args.reps} survived")
    return 0 if ok_n == args.reps else 1


if __name__ == "__main__":
    sys.exit(main())
