#!/usr/bin/env python3
"""T-DB-DISAPPEAR: the database vanishes mid-transaction, then returns.

Fault: `docker stop ping-gauntlet-pg` (SCRATCH container only) while a
checkpoint write is in flight, then `docker start` it again.

Expected: the in-flight operation raises (fail closed, never silent success);
the uncommitted write is rolled back (no partial state); pre-outage committed
data is intact; post-recovery writes succeed. NOT-RUN if the A6 re-proof is
still using the database (checked via pg_stat_activity on public tables).
"""
import subprocess
import sys
import time

sys.path.insert(0, "/home/nolan/ping-gauntlet/orca-gauntlet")
import gauntlet_lib as g


def docker(*args):
    return subprocess.run(["docker", *args], capture_output=True, text=True, timeout=120)


def a6_active():
    """True if the A6 re-proof loop is currently running (never disrupt it)."""
    r = subprocess.run(["pgrep", "-f", "orca_control_loop.js"],
                       capture_output=True, text=True)
    return r.returncode == 0


def wait_ready(timeout=90):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = docker("exec", "ping-gauntlet-pg", "pg_isready", "-U", "gauntlet",
                   "-d", "ping_gauntlet")
        if r.returncode == 0:
            return True
        time.sleep(2)
    return False


def main():
    if a6_active():
        return {"verdict": "NOT-RUN",
                "evidence": {"reason": "A6 re-proof may be using the DB; deferred"}}
    conn = g.db()
    conn.autocommit = True
    run = g.new_run(conn, prompt_ref="t-db-disappear")
    committed_before = g.checkpoint(conn, run, {"marker": "pre-outage"})

    # begin a write, then kill the DB mid-transaction
    tx = g.db()  # autocommit off: explicit transaction
    tx.execute("INSERT INTO gauntlet.checkpoints(run_id, checkpoint_id, state, state_digest) "
               "VALUES (%s, 999, '{\"marker\":\"uncommitted\"}'::jsonb, 'x')", (str(run),))
    r = docker("stop", "-t", "2", "ping-gauntlet-pg")
    stopped = r.returncode == 0

    raised = None
    try:
        tx.commit()
    except Exception as e:
        raised = f"{type(e).__name__}: {str(e)[:160]}"
    try:
        tx.close()
    except Exception:
        pass

    r = docker("start", "ping-gauntlet-pg")
    started = r.returncode == 0 and wait_ready()

    c2 = g.db()
    c2.autocommit = True
    cur = c2.execute(
        "SELECT COUNT(*) FROM gauntlet.checkpoints WHERE run_id=%s AND checkpoint_id=999",
        (str(run),))
    phantom = cur.fetchone()[0]
    pre = g.restore_checkpoint(c2, run, committed_before)
    post_ok = False
    if started:
        try:
            cid = g.checkpoint(c2, run, {"marker": "post-recovery"})
            post_ok = cid == committed_before + 1
        except Exception as e:
            post_ok = f"write failed: {e}"[:160]

    evidence = {
        "container_stopped": stopped,
        "in_flight_commit_raised": raised is not None,
        "raise_kind": (raised or "").split(":")[0],
        "container_restarted": started,
        "uncommitted_write_phantom_rows": phantom,
        "pre_outage_checkpoint_intact": pre == {"marker": "pre-outage"},
        "post_recovery_write_ok": post_ok,
    }
    ok = (stopped and raised is not None and started and phantom == 0
          and pre == {"marker": "pre-outage"} and post_ok is True)
    return {"verdict": "PASS" if ok else "FAIL", "evidence": evidence}


if __name__ == "__main__":
    import json
    print(json.dumps(main(), indent=2))
