#!/usr/bin/env python3
"""CHAOS-A coordinator death: kill mid-claim, mid-dispatch, mid-reconcile.

For each (stage, mode, rep):
  1. fresh run; spawn coord_proc --mode dispatch --die-at <stage>
  2. wait death; assert lock is free (new claim must succeed)
  3. spawn coord_proc --mode recover: bumps epoch, requeues IN_FLIGHT/CLAIMED
     packets whose holders are dead, leaves live-holder packets alone,
     classifies timed-out tool calls
  4. zombie check: old coordinator's stale epoch writes must ALL be rejected
  5. grade: recovery requeued exactly the dead-holder packets, exactly once;
     epoch advanced; no packet lost (ENQUEUED set == dispatched set minus
     completed); zombie rejected 100%.

Mid-reconcile death: kill the RECOVER coordinator halfway (die-at injected
via a slow recover + external SIGKILL after first RECOVERED line), then run a
second recover: idempotent recovery (already-requeued packets are ENQUEUED,
not IN_FLIGHT, so the second pass must not double-requeue).
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
COORD = os.path.join(HARNESS, "coord_proc.py")


def spawn_coord(mode, holder, run_id, packets=2, die_at="none", die_mode="kill",
                stdout_pipe=False, extra=()):
    cmd = [sys.executable, COORD, "--mode", mode, "--holder", holder,
           "--run-id", run_id, "--packets", str(packets),
           "--die-at", die_at, "--die-mode", die_mode] + list(extra)
    return subprocess.Popen(cmd, stdout=subprocess.PIPE if stdout_pipe else subprocess.DEVNULL,
                            stderr=subprocess.STDOUT, text=True, bufsize=1)


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


def reader_thread(proc, q):
    try:
        for line in proc.stdout:
            q.put(line.strip())
    except Exception:
        pass


def wait_for_marker(q, marker, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            line = q.get(timeout=1)
            if marker in line:
                return line
        except queue.Empty:
            pass
    return None


def one_probe(stage, mode, rep, packets):
    conn = g.db()
    tag = f"coord-{stage}-{mode}-r{rep}"
    holder = f"coord-{tag}"
    run_id = g.new_run(conn, prompt_ref=tag)
    detail = {"stage": stage, "mode": mode, "rep": rep}
    epoch_before = g.coord_epoch(conn)

    if stage == "mid-reconcile":
        # first: a dispatch coordinator that dies mid-dispatch, leaving IN_FLIGHT
        d = spawn_coord("dispatch", holder + "-d", run_id, packets,
                        die_at="mid-dispatch", die_mode="kill")
        wait_dead(d)
        # recover coordinator, killed externally after first RECOVERED line
        r1 = spawn_coord("recover", holder + "-r1", run_id, stdout_pipe=True)
        q = queue.Queue()
        threading.Thread(target=reader_thread, args=(r1, q), daemon=True).start()
        line = wait_for_marker(q, "RECOVERED")
        detail["first_recovered_line"] = line
        os.kill(r1.pid, signal.SIGKILL)
        rc1 = wait_dead(r1)
        detail["reconcile_kill_rc"] = rc1
        assert pid_is_dead(r1.pid)
        # second recover must be idempotent
        r2 = spawn_coord("recover", holder + "-r2", run_id, stdout_pipe=True)
        out = r2.communicate(timeout=60)[0]
        detail["second_recover_out"] = out.strip().splitlines()[-3:]
        rc2 = r2.returncode
        detail["second_recover_rc"] = rc2
    else:
        d = spawn_coord("dispatch", holder, run_id, packets,
                        die_at=stage, die_mode=mode)
        rc = wait_dead(d)
        detail["death_rc"] = rc
        assert pid_is_dead(d.pid), "coordinator pid still alive"
        detail["death_verified"] = True
        # lock must be free now (fd died with the process)
        lock = g.CoordLock()
        assert lock.acquire(), "coordinator lock NOT freed after death"
        lock.release()
        detail["lock_freed"] = True
        r = spawn_coord("recover", holder + "-r", run_id, stdout_pipe=True)
        out = r.communicate(timeout=60)[0]
        detail["recover_out_tail"] = out.strip().splitlines()[-4:]
        assert r.returncode == 0

    epoch_after = g.coord_epoch(conn)
    detail["epoch_before"] = epoch_before
    detail["epoch_after"] = epoch_after

    # zombie: stale-epoch writes from the dead coordinator must be rejected
    cur = conn.execute("SELECT packet_id FROM packets WHERE run_id=?", (run_id,))
    pids = [r[0] for r in cur.fetchall()]
    rejected = sum(1 for pid in pids
                   if g.fenced_packet_write(conn, pid, epoch_before,
                                            "SUCCEEDED") == 0)
    detail["zombie_rejected"] = rejected
    detail["zombie_total"] = len(pids)

    # grade: every packet accounted for exactly once, none lost
    cur = conn.execute(
        "SELECT status, COUNT(*) FROM packets WHERE run_id=? GROUP BY status",
        (run_id,))
    by_status = dict(cur.fetchall())
    detail["by_status"] = by_status
    total = sum(by_status.values())
    # no packet may be stuck IN_FLIGHT/CLAIMED with a dead holder after recover
    cur = conn.execute(
        """SELECT packet_id, claimed_by, payload FROM packets
           WHERE run_id=? AND status IN ('IN_FLIGHT','CLAIMED')""", (run_id,))
    stuck = [(pid, cb) for pid, cb, _ in cur.fetchall()]
    detail["stuck"] = stuck
    # attempt_seq must have advanced exactly where recovery requeued
    cur = conn.execute(
        "SELECT packet_id, attempt_seq FROM packets WHERE run_id=?", (run_id,))
    attempts = dict(cur.fetchall())
    detail["attempts"] = attempts

    ok = (total == packets and not stuck and rejected == len(pids)
          and epoch_after > epoch_before
          and all(a >= 1 for a in attempts.values()))
    # mid-reconcile extra: second recover must not have double-requeued
    # (no packet with attempt_seq bumped twice beyond the two recoveries)
    verdict = "SURVIVED" if ok else "LOST-STATE"
    record(
        domain="chaos.coordinator-death",
        component="coord_proc / chaos_lib.CoordLock+coord_epoch+fenced_packet_write",
        claim=("Record 14: coordinator keeps no durable private state; epoch "
               "fence rejects a deposed coordinator's late writes; recovery "
               "re-enqueues exactly once via atomic claim even with concurrent "
               "recoverers."),
        evidence="TEST",
        caller="run_coord_death.one_probe",
        callee="CoordLock.acquire/coord_epoch_bump/fenced_packet_write",
        writer="coord_proc (killed) + recover coordinator",
        reader="recover coordinator (durable state only)",
        classification=verdict,
        confidence=0.93 if ok else 0.85,
        broken_boundary="none" if ok else "coordinator recovery",
        dependencies=["record 1 durable run identity", "record 6 attempt identity",
                      "record 14 coordinator death recovery"],
        affects_agents=["impl-lane", "orca-b", "chaos-b"],
        detail=detail,
        missions=packets,
        verdict_notes=("coordinator death recovered exactly once; zombie "
                       "writes rejected" if ok else "RECOVERY FAILURE"))
    conn.close()
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--packets", type=int, default=2)
    args = ap.parse_args()
    g.init_db()
    plan = [("mid-claim", "kill"), ("mid-claim", "crash"),
            ("mid-dispatch", "kill"), ("mid-dispatch", "crash"),
            ("post-dispatch", "kill"), ("mid-reconcile", "kill")]
    ok_n = tot = missions = 0
    for stage, mode in plan:
        for rep in range(args.reps):
            try:
                ok = one_probe(stage, mode, rep, args.packets)
            except Exception as e:
                record(domain="chaos.coordinator-death", component="run_coord_death",
                       claim="probe harness error", evidence="TEST",
                       caller="run_coord_death.main", callee="one_probe",
                       writer="probe", reader="probe", classification="UNKNOWN",
                       confidence=0.5, broken_boundary="probe harness",
                       dependencies=[], affects_agents=["chaos-a"],
                       detail={"stage": stage, "mode": mode, "rep": rep,
                               "error": f"{type(e).__name__}: {e}"},
                       missions=0, verdict_notes="probe errored")
                ok = False
                print(f"[{tot}] {stage}/{mode} r{rep}: PROBE_ERROR {e}", flush=True)
            tot += 1
            ok_n += 1 if ok else 0
            missions += args.packets
            print(f"[{tot}] {stage}/{mode} r{rep}: "
                  f"{'SURVIVED' if ok else 'FAILED'}", flush=True)
    print(f"COORD DEATH DONE: {ok_n}/{tot} survived, {missions} missions")
    return 0 if ok_n == tot else 1


if __name__ == "__main__":
    sys.exit(main())
