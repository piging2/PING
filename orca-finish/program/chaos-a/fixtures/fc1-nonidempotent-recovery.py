#!/usr/bin/env python3
"""FIXTURE FC-1: crash-recovery without idempotent effect keys duplicates
side effects. GENERIC CLASS (not a local accident).

Repro: worker crashes at step 2 with non-idempotent (plain) effects;
naive requeue runs all 3 steps again -> step 1's side effect applied twice.

Run: python3 fixtures/fc1-nonidempotent-recovery.py
Expects: DUPLICATED (4 effect rows for 3 steps). If this ever prints
SURVIVED, the class is fixed or the fixture rotted.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g

HARNESS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "..", "harness")
WORKER = os.path.join(HARNESS, "worker_proc.py")


def main():
    g.init_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc1-repro")
    lease = f"lease-{run_id[:8]}"
    token = g.lease_issue(conn, lease, "w", 600)
    pid, _ = g.new_packet(conn, run_id)
    conn.close()

    def spawn(extra):
        return subprocess.run(
            [sys.executable, WORKER, "--run-id", run_id, "--packet-id", pid,
             "--worker-id", "w-fc1", "--lease-id", lease, "--token", token,
             "--steps", "3", "--step-seconds", "0.02"] + extra,
            capture_output=True, text=True, timeout=60)

    r1 = spawn(["--crash-at-step", "2", "--effect-mode", "plain"])
    assert r1.returncode == 99, f"expected supervisor reap rc=99, got {r1.returncode}"
    conn = g.db()
    g.set_packet(conn, pid, "ENQUEUED")  # naive requeue
    conn.close()
    r2 = spawn(["--effect-mode", "plain"])
    assert r2.returncode == 0
    conn = g.db()
    n_eff, n_steps = g.count_effects(conn, pid)
    print(f"effects={n_eff} distinct_steps={n_steps} (3 steps)")
    print("DUPLICATED" if n_eff > 3 else "SURVIVED")
    return 0 if n_eff > 3 else 1


if __name__ == "__main__":
    sys.exit(main())
