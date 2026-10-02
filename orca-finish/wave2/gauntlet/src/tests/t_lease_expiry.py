#!/usr/bin/env python3
"""T-LEASE-EXPIRY: a worker's tool lease expires mid-work (record 13).

Expected: the worker fails closed at the next step boundary - no further
effect records, no success claim. The packet is left for honest recovery,
never marked SUCCEEDED on an expired lease.
"""
import os
import subprocess
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g

HERE = "/home/nolan/ping-gauntlet/orca-gauntlet"


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-lease-expiry")
    packet = g.new_packet(conn, run, kind="lease-work")
    lease_id = f"lease-le-{os.getpid()}"
    token = g.lease_issue(conn, lease_id, "worker-lease", ttl_s=3)

    t0 = time.time()
    w = subprocess.Popen(
        [sys.executable, f"{HERE}/worker.py", "--run-id", str(run),
         "--packet-id", str(packet), "--worker-id", "worker-lease",
         "--lease-id", lease_id, "--token", token, "--steps", "10",
         "--step-seconds", "1", "--fencing", "7"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    rc = w.wait(timeout=60)
    out = w.stdout.read()
    elapsed = time.time() - t0

    c2 = g.db()
    step_counts = {i: g.count_audit(c2, run, "effect.step", i) for i in range(1, 11)}
    done_steps = [i for i, v in step_counts.items() if v == 1]
    stops = g.count_audit(c2, run, "worker.lease_invalid_stop")
    pkt = g.get_packet(c2, run and packet)

    evidence = {
        "worker_rc": rc,
        "elapsed_s": round(elapsed, 1),
        "lease_ttl_s": 3,
        "steps_completed": done_steps,
        "lease_invalid_stops": stops,
        "worker_output_tail": out.strip().splitlines()[-2:],
        "packet_status": pkt["status"],
        "no_success_on_expired_lease": pkt["status"] != "SUCCEEDED",
    }
    # fail closed: worker exits 2 (LEASE_INVALID_STOP), stops within a step or
    # two of expiry, never claims success
    ok = (rc == 2 and stops >= 1 and pkt["status"] != "SUCCEEDED"
          and max(done_steps, default=0) <= 5)
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
