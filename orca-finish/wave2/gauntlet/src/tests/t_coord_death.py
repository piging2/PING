#!/usr/bin/env python3
"""T-COORD-DEATH: coordinator (scheduler) dies mid-dispatch (SIGKILL).

Expected recovery: a new coordinator acquires the advisory-lock claim (freed
when the dead session dropped), bumps the epoch, requeues the orphaned
IN_FLIGHT packet exactly once (attempt+1, new epoch), and the dead
coordinator's late write with the stale epoch is rejected (0 rows).
"""
import os
import re
import signal
import subprocess
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g

HERE = "/home/nolan/ping-gauntlet/orca-gauntlet"


def main():
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-coord-death")
    epoch_before = g.coord_epoch(conn)

    dummy = subprocess.Popen(["sleep", "600"])
    coord_a = subprocess.Popen(
        [sys.executable, f"{HERE}/coord_proc.py", "--mode", "dispatch",
         "--holder", "coord-A", "--run-id", str(run),
         "--worker-pid", str(dummy.pid)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    # wait for mid-dispatch: p1 IN_FLIGHT
    p1 = None
    t0 = time.time()
    while time.time() - t0 < 30:
        cur = g.db().execute(
            "SELECT packet_id FROM gauntlet.packets WHERE run_id=%s AND status='IN_FLIGHT'",
            (str(run),))
        r = cur.fetchone()
        if r:
            p1 = r[0]
            break
        time.sleep(0.5)
    if not p1:
        coord_a.kill()
        dummy.kill()
        return {"verdict": "NOT-RUN",
                "evidence": {"reason": "coord-A never dispatched p1"}}
    cur = g.db().execute(
        "SELECT coordinator_epoch, attempt_seq FROM gauntlet.packets WHERE packet_id=%s",
        (str(p1),))
    old_epoch, old_attempt = cur.fetchone()

    os.kill(coord_a.pid, signal.SIGKILL)
    coord_a.wait()
    os.kill(dummy.pid, signal.SIGKILL)
    dummy.wait()
    time.sleep(2)  # let PG drop the dead session and free the advisory lock

    coord_b = subprocess.Popen(
        [sys.executable, f"{HERE}/coord_proc.py", "--mode", "recover",
         "--holder", "coord-B", "--run-id", str(run)],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out_b = coord_b.communicate(timeout=60)[0]
    rc_b = coord_b.returncode

    c2 = g.db()
    c2.autocommit = True
    claim_held_by_b = "CLAIM_HELD holder=coord-B" in out_b
    recovered_line = [l for l in out_b.splitlines() if l.startswith("RECOVERED")]
    pkt = g.get_packet(c2, p1)
    epoch_after = g.coord_epoch(c2)
    # zombie late write with the stale epoch must be rejected
    zombie_rows = g.fenced_packet_write(c2, p1, old_epoch, "SUCCEEDED")
    pkt_after_zombie = g.get_packet(c2, p1)

    evidence = {
        "coord_a_sigkilled": True,
        "coord_b_rc": rc_b,
        "coord_b_claim_held": claim_held_by_b,
        "coord_b_output": out_b.strip().splitlines(),
        "recovered_lines": recovered_line,
        "old_epoch": old_epoch, "epoch_after": epoch_after,
        "p1_status": pkt["status"], "p1_attempt_seq": pkt["attempt_seq"],
        "p1_epoch": pkt["coordinator_epoch"],
        "zombie_write_rows": zombie_rows,
        "p1_status_after_zombie": pkt_after_zombie["status"],
    }
    ok = (rc_b == 0 and claim_held_by_b and len(recovered_line) == 1
          and pkt["status"] == "ENQUEUED"
          and pkt["attempt_seq"] == old_attempt + 1
          and pkt["coordinator_epoch"] == epoch_after
          and epoch_after > old_epoch
          and zombie_rows == 0 and pkt_after_zombie["status"] == "ENQUEUED")
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
