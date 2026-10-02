#!/usr/bin/env python3
"""CHAOS-A kill matrix: SIGKILL/SIGTERM at every dispatch stage of the worker.

Injected die-at stages (deterministic): S1 S2 S3 S41 S41C S42 S5 S6 S7,
  die-mode kill (os._exit(137), no cleanup, identical observable to SIGKILL).
External kills (genuine signal from the probe): SIGKILL right after spawn,
  SIGKILL after stdout shows "step 1 done".
Graceful: SIGTERM after "step 1 done" and after "step 3 done" (worker flushes
  checkpoint and exits 0).

After every death: verify death, recover (fresh claim if ENQUEUED, takeover
worker with --takeover-from if CLAIMED/IN_FLIGHT, reclaim-refused if terminal),
then grade: no duplicate delegation (effects exactly 1..N once each),
exactly one completion, correct terminal states.

Usage: run_kill_matrix.py [--reps N] [--packets N] [--stages S1,S2,...]
"""
import argparse
import os
import queue
import signal
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
WORKER = os.path.join(HARNESS, "worker_proc.py")
STEPS = 3


def spawn_worker(run_id, packet_id, worker_id, lease_id, token,
                 die_at="none", die_mode="none", takeover_from=None,
                 fencing=1, stdout_pipe=False):
    cmd = [sys.executable, WORKER, "--run-id", run_id, "--packet-id", packet_id,
           "--worker-id", worker_id, "--lease-id", lease_id, "--token", token,
           "--steps", str(STEPS), "--step-seconds", "0.1",
           "--die-at", die_at, "--die-mode", die_mode,
           "--fencing", str(fencing)]
    if takeover_from:
        cmd += ["--takeover-from", takeover_from]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE if stdout_pipe else subprocess.DEVNULL,
                            stderr=subprocess.STDOUT, text=True, bufsize=1)


def wait_dead(proc, timeout=30):
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


def reader_thread(proc, q):
    try:
        for line in proc.stdout:
            q.put(line.strip())
    except Exception:
        pass


def wait_for_marker(q, marker, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            line = q.get(timeout=1)
            if marker in line:
                return True
        except queue.Empty:
            pass
    return False


def grade(conn, run_id, packet_id, expect_suppressed=0):
    n_eff, n_steps = g.count_effects(conn, packet_id)
    n_comp = g.count_completions(conn, packet_id)
    pkt = g.get_packet(conn, packet_id)
    run = g.get_run(conn, run_id)
    n_del, n_workers = g.count_delegations(conn, packet_id)
    suppressed = g.count_audit(conn, run_id, "completion.duplicate_suppressed")
    ok = (n_eff == STEPS and n_steps == STEPS and n_comp == 1
          and pkt["status"] == "SUCCEEDED" and run["status"] == "COMPLETED"
          and suppressed == expect_suppressed)
    return ok, {"effects": n_eff, "distinct_steps": n_steps,
                "completions": n_comp, "packet_status": pkt["status"],
                "run_status": run["status"], "delegations": n_del,
                "distinct_workers": n_workers, "suppressed": suppressed}


def recover_and_grade(conn, run_id, packet_id, old_worker, lease_id, token,
                      expect_suppressed=0):
    pkt = g.get_packet(conn, packet_id)
    if pkt["status"] == "ENQUEUED":
        w = spawn_worker(run_id, packet_id, old_worker + "-r2", lease_id, token,
                         fencing=2)
        rc = wait_dead(w)
        ok, d = grade(conn, run_id, packet_id, expect_suppressed)
        d["recovery"] = f"fresh-claim rc={rc}"
        return ok, d
    if pkt["status"] in ("CLAIMED", "IN_FLIGHT"):
        w = spawn_worker(run_id, packet_id, old_worker + "-r2", lease_id, token,
                         takeover_from=old_worker, fencing=2)
        rc = wait_dead(w)
        if rc == 4:  # RECLAIM_FAILED
            d = {"recovery": "reclaim-refused", "rc": rc}
            ok, g2 = grade(conn, run_id, packet_id, expect_suppressed)
            d.update(g2)
            return ok, d
        ok, d = grade(conn, run_id, packet_id, expect_suppressed)
        d["recovery"] = f"takeover rc={rc}"
        return ok, d
    # terminal already (S7): takeover must refuse
    w = spawn_worker(run_id, packet_id, old_worker + "-r2", lease_id, token,
                     takeover_from=old_worker, fencing=2)
    rc = wait_dead(w)
    ok, d = grade(conn, run_id, packet_id, expect_suppressed)
    d["recovery"] = f"terminal-refusal rc={rc} (expect 4)"
    return ok and rc == 4, d


def one_probe(stage, mode, rep, packets):
    """One probe = `packets` packet lifecycles killed at (stage, mode)."""
    conn = g.db()
    probe_tag = f"kill-{stage}-{mode}-r{rep}"
    results = []
    for pi in range(packets):
        run_id = g.new_run(conn, prompt_ref=probe_tag)
        lease_id = f"lease-{run_id[:8]}"
        token = g.lease_issue(conn, lease_id, "worker-orig", 600)
        packet_id, _ = g.new_packet(conn, run_id, kind="t",
                                    payload={"probe": probe_tag})
        old_worker = f"w-{stage}-{mode}-{rep}-{pi}"
        detail = {"stage": stage, "mode": mode, "rep": rep}

        if mode == "injected":
            w = spawn_worker(run_id, packet_id, old_worker, lease_id, token,
                             die_at=stage, die_mode="kill")
            rc = wait_dead(w)
            detail["death_rc"] = rc
        elif mode == "external":
            w = spawn_worker(run_id, packet_id, old_worker, lease_id, token,
                             stdout_pipe=True)
            q = queue.Queue()
            t = threading.Thread(target=reader_thread, args=(w, q), daemon=True)
            t.start()
            marker = "step 1 done" if stage == "post-step1" else None
            if marker:
                assert wait_for_marker(q, marker), "worker never reached marker"
            time.sleep(0.05)
            os.kill(w.pid, signal.SIGKILL)
            rc = wait_dead(w)
            detail["death_rc"] = rc
            detail["external_sigkill"] = True
        elif mode == "term":
            w = spawn_worker(run_id, packet_id, old_worker, lease_id, token,
                             stdout_pipe=True)
            q = queue.Queue()
            t = threading.Thread(target=reader_thread, args=(w, q), daemon=True)
            t.start()
            marker = "step 3 done" if stage == "post-step3" else "step 1 done"
            assert wait_for_marker(q, marker), "worker never reached marker"
            time.sleep(0.05)
            os.kill(w.pid, signal.SIGTERM)
            rc = wait_dead(w)
            detail["death_rc"] = rc
            detail["graceful"] = True
        else:
            raise ValueError(mode)

        assert pid_is_dead(w.pid), "worker pid still alive after death"
        detail["death_verified"] = True
        conn.execute(
            "UPDATE packets SET payload=json_insert(payload,'$.worker_pid',?)"
            " WHERE packet_id=?", (w.pid, packet_id))
        conn.commit()

        ok, gd = recover_and_grade(
            conn, run_id, packet_id, old_worker, lease_id, token,
            expect_suppressed=1 if stage == "S6" else 0)
        detail.update(gd)
        results.append(ok)
        conn.close()
        conn = g.db()

    verdict = "SURVIVED" if all(results) else "DUPLICATED" if any(
        r is False for r in results) else "UNKNOWN"
    # refine: distinguish lost-state from duplication via detail
    pid2 = record(
        domain="chaos.kill-matrix",
        component="worker_proc / chaos_lib.claim_packet+apply_effect+emit_completion",
        claim=("A6 re-proof (mechanism-map records 1,6,7,14; A5-VERDICT 6a342dd27): "
               "kill at any dispatch stage, then reconstruct from durable state "
               "with no duplicate delegation and correct completion."),
        evidence="TEST",
        caller=f"run_kill_matrix.one_probe",
        callee="claim_packet/apply_effect/checkpoint/emit_completion/reclaim_packet",
        writer="worker_proc (killed) + takeover worker",
        reader="recover_and_grade (durable state only)",
        classification=verdict,
        confidence=0.95 if all(results) else 0.9,
        broken_boundary="none" if all(results) else "durable-state reconstruction",
        dependencies=["record 1 durable run identity", "record 6 attempt identity",
                      "record 7 checkpoint/resume", "record 8 idempotent effects",
                      "record 14 coordinator death recovery"],
        affects_agents=["impl-lane", "orca-b", "chaos-b"],
        detail=detail,
        missions=packets,
        verdict_notes=("all packets completed exactly once, no duplicate "
                       "delegation" if all(results) else
                       "RECOVERY FAILURE: see detail"))
    conn.close()
    return all(results), pid2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--packets", type=int, default=2)
    ap.add_argument("--stages", default="",
                    help="comma list to restrict stages")
    args = ap.parse_args()

    g.init_db()
    injected = ["S1", "S2", "S3", "S41", "S41C", "S42", "S5", "S6", "S7"]
    external = ["post-spawn", "post-step1"]
    terms = ["post-step1", "post-step3"]
    plan = []
    only = set(args.stages.split(",")) if args.stages else None
    for s in injected:
        if only and s not in only:
            continue
        plan.append((s, "injected"))
    for s in external:
        if only and s not in only:
            continue
        plan.append((s, "external"))
    for s in terms:
        if only and s not in only:
            continue
        plan.append((s, "term"))

    ok_n = tot = missions = 0
    for stage, mode in plan:
        for rep in range(args.reps):
            try:
                ok, pid = one_probe(stage, mode, rep, args.packets)
            except Exception as e:
                pid = record(
                    domain="chaos.kill-matrix", component="run_kill_matrix",
                    claim="probe harness error (not a mechanism verdict)",
                    evidence="TEST", caller="run_kill_matrix.main",
                    callee="one_probe", writer="probe", reader="probe",
                    classification="UNKNOWN", confidence=0.5,
                    broken_boundary="probe harness",
                    dependencies=[], affects_agents=["chaos-a"],
                    detail={"stage": stage, "mode": mode, "rep": rep,
                            "error": f"{type(e).__name__}: {e}"},
                    missions=0,
                    verdict_notes="probe errored; mechanism verdict UNKNOWN")
                ok = False
                print(f"[{tot}] {stage}/{mode} r{rep}: PROBE_ERROR {e} ({pid})",
                      flush=True)
            tot += 1
            ok_n += 1 if ok else 0
            missions += args.packets
            print(f"[{tot}] {stage}/{mode} r{rep}: "
                  f"{'SURVIVED' if ok else 'FAILED'} ({pid})", flush=True)
    print(f"KILL MATRIX DONE: {ok_n}/{tot} probes survived, {missions} missions")
    return 0 if ok_n == tot else 1


if __name__ == "__main__":
    sys.exit(main())
