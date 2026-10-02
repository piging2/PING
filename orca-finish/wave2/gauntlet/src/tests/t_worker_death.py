#!/usr/bin/env python3
"""T-WORKER-DEATH: worker process dies mid-mission (SIGKILL).

Expected recovery: a fresh worker rehydrates from durable state alone
(run row + latest checkpoint), reclaims the packet, resumes AFTER the last
checkpointed step, and finishes. No step effect may execute twice.
"""
import os
import signal
import subprocess
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g

HERE = "/home/nolan/ping-gauntlet/orca-gauntlet"


def wait_for(cond, timeout=60, interval=0.5):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if cond():
            return True
        time.sleep(interval)
    return False


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-worker-death")
    packet = g.new_packet(conn, run, kind="mission-5step")
    lease_id = f"lease-wd-{os.getpid()}"
    token = g.lease_issue(conn, lease_id, "worker-1", ttl_s=600)

    w1 = subprocess.Popen(
        [sys.executable, f"{HERE}/worker.py", "--run-id", str(run),
         "--packet-id", str(packet), "--worker-id", "worker-1",
         "--lease-id", lease_id, "--token", token, "--steps", "5",
         "--step-seconds", "1", "--fencing", "1"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    step3 = wait_for(lambda: g.count_audit(g.db(), run, "effect.step", 3) >= 1, 30)
    if not step3:
        w1.kill()
        return {"verdict": "NOT-RUN",
                "evidence": {"reason": "worker never reached step 3"}}
    os.kill(w1.pid, signal.SIGKILL)
    w1.wait()
    dead = wait_for(lambda: g.count_audit(g.db(), run, "effect.step", 4) == 0, 3)
    # prove the process is really gone before takeover (no fake death)
    try:
        os.kill(w1.pid, 0)
        still_alive = True
    except ProcessLookupError:
        still_alive = False

    w2 = subprocess.Popen(
        [sys.executable, f"{HERE}/worker.py", "--run-id", str(run),
         "--packet-id", str(packet), "--worker-id", "worker-2",
         "--lease-id", lease_id, "--token", token, "--steps", "5",
         "--step-seconds", "1", "--takeover-from", "worker-1", "--fencing", "2"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    rc = w2.wait(timeout=90)
    out2 = w2.stdout.read()

    c2 = g.db()
    step_counts = {i: g.count_audit(c2, run, "effect.step", i) for i in range(1, 6)}
    pkt = g.get_packet(c2, packet)
    cp = g.latest_checkpoint(c2, run)
    rehydrated = g.count_audit(c2, run, "worker.rehydrated") >= 1

    evidence = {
        "w1_sigkilled": True, "w1_really_dead": not still_alive,
        "w2_rc": rc, "w2_tail": out2.strip().splitlines()[-3:],
        "step_effect_counts": step_counts,
        "packet_status": pkt["status"], "packet_attempt_seq": pkt["attempt_seq"],
        "latest_checkpoint": cp["checkpoint_id"] if cp else None,
        "rehydrated_from_durable_state": rehydrated,
    }
    ok = (not still_alive and rc == 0
          and all(v == 1 for v in step_counts.values())
          and pkt["status"] == "SUCCEEDED" and rehydrated)
    evidence["no_step_ran_twice"] = all(v == 1 for v in step_counts.values())
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
