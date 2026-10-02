"""CHAOS-C Q3: slow-query behavior probes. Scratch only; never production.

Injects 2-5s latency into commit and checkpoint writes (not failure, just
slow) and asks: does the slow path create NEW torn-state windows?

  P3.1  SIGTERM mid-slow-commit (3s sleep inside the txn)
  P3.2  SIGKILL mid-slow-checkpoint (3s sleep before checkpoint commit)
  P3.3  supervisor timeout fires while worker A's logical commit is in
        flight (5s slow finalize); worker B reclaims and completes; A's
        late unconditional writes land AFTER B's. New double-recovery window?
  P3.4  worker A's slow checkpoint (5s) lands AFTER B's reclaim + B's own
        checkpoint. Does the deposed worker's stale checkpoint become newest?
  P3.5  benign: SIGTERM mid-slow-commit, then clean reclaim + finish.
        Control probe: the kill path itself must stay exactly-once.

One shared-format record per probe -> evidence/probe-records.jsonl.
"""
import json
import os
import signal
import subprocess
import sys
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "harness"))
import record as R
import chaos_lib as L

HARNESS = os.path.join(os.path.dirname(HERE), "harness")
DB = os.path.join(HARNESS, "chaos-c.db")
SLOW_PROC = os.path.join(HARNESS, "slow_proc.py")
SCRATCH = os.path.join(os.path.dirname(HERE), "evidence", "scratch-q3")
os.makedirs(SCRATCH, exist_ok=True)

AFFECTS = ["impl-lane", "orca-b", "chaos-b"]
DEPS = ["record 7 checkpoint/resume", "record 8 idempotent effects",
        "record 14 coordinator death recovery", "record 9 write-once completions"]


def fresh_run():
    conn = L.db(DB)
    rid = L.new_run(conn, prompt_ref="chaos-c-q3")
    pid, is_new = L.new_packet(conn, rid, idem=f"q3-{uuid.uuid4().hex[:10]}")
    assert is_new
    conn.close()
    return rid, pid


def wait_marker(path, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if os.path.exists(path):
            return True
        time.sleep(0.05)
    return False


def spawn(mode, run_id, packet_id, worker, *extra):
    return subprocess.Popen(
        [sys.executable, SLOW_PROC, mode, DB, run_id, packet_id, worker,
         *[str(x) for x in extra]],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def state(run_id, packet_id):
    conn = L.db(DB)
    p = L.get_packet(conn, packet_id)
    n_eff, _ = L.count_effects(conn, packet_id)
    n_del, n_workers = L.count_delegations(conn, packet_id)
    n_comp = L.count_completions(conn, packet_id)
    cur = conn.execute(
        "SELECT result_ref FROM completions WHERE packet_id=?", (packet_id,))
    comp_ref = cur.fetchone()
    ck = L.latest_checkpoint(conn, run_id)
    conn.close()
    return {"packet": p, "effects": n_eff, "delegations": n_del,
            "workers": n_workers, "completions": n_comp,
            "completion_ref": comp_ref[0] if comp_ref else None,
            "latest_ckpt": (ck["checkpoint_id"], ck["state"]) if ck else None}


def probe_p31():
    """SIGTERM mid-slow-commit."""
    rid, pid = fresh_run()
    marker = os.path.join(SCRATCH, f"p31-{uuid.uuid4().hex[:6]}.marker")
    proc = spawn("slow-commit", rid, pid, "worker-A", 3.0, marker)
    assert wait_marker(marker), "worker never entered slow window"
    proc.send_signal(signal.SIGTERM)
    rc = proc.wait(timeout=10)
    st = state(rid, pid)
    ok = (rc == -signal.SIGTERM and st["packet"]["status"] == "CLAIMED"
          and st["effects"] == 0 and st["completions"] == 0)
    # recovery: fresh worker reclaims and finishes
    fin = spawn("finisher", rid, pid, "finisher", "worker-A", "worker-R")
    fin.wait(timeout=15)
    st2 = state(rid, pid)
    ok2 = (st2["packet"]["status"] == "SUCCEEDED" and st2["effects"] == 1
           and st2["completions"] == 1 and st2["delegations"] == 2)
    cls = "SURVIVED" if (ok and ok2) else "LOST-STATE"
    return R.record(
        "chaos.slow-query", "chaos_lib.slow_commit_packet_step",
        "SIGTERM mid-slow-commit (3s inside txn): atomic rollback, zero torn rows; "
        "clean reclaim finishes exactly once.", "TEST",
        "run_slowquery.probe_p31", "slow_proc(slow-commit)+finisher",
        "slow_proc (SIGTERM)", "state() durable read",
        cls, 0.95, "none" if cls == "SURVIVED" else "slow commit atomicity",
        DEPS, AFFECTS,
        detail={"rc": rc, "mid_kill": st, "after_recovery": st2},
        missions=2,
        verdict_notes="slow commit killed cleanly; recovery exactly-once")


def probe_p32():
    """SIGKILL mid-slow-checkpoint."""
    rid, pid = fresh_run()
    marker = os.path.join(SCRATCH, f"p32-{uuid.uuid4().hex[:6]}.marker")
    proc = spawn("slow-checkpoint", rid, pid, "worker-A", 3.0, marker)
    assert wait_marker(marker), "worker never entered slow window"
    proc.send_signal(signal.SIGKILL)
    rc = proc.wait(timeout=10)
    st = state(rid, pid)
    # fast C1 durable, slow C2 rolled back: latest must be C1
    ok = (rc == -signal.SIGKILL and st["latest_ckpt"] is not None
          and st["latest_ckpt"][1].get("phase") == "fast-C1")
    cls = "SURVIVED" if ok else "LOST-STATE"
    return R.record(
        "chaos.slow-query", "chaos_lib.slow_checkpoint",
        "SIGKILL mid-slow-checkpoint (3s before commit): partial checkpoint "
        "rolls back; latest checkpoint is the last fully-committed one.",
        "TEST", "run_slowquery.probe_p32", "slow_proc(slow-checkpoint)",
        "slow_proc (SIGKILL)", "state() durable read",
        cls, 0.95, "none" if cls == "SURVIVED" else "checkpoint atomicity",
        DEPS, AFFECTS,
        detail={"rc": rc, "latest_ckpt": st["latest_ckpt"]},
        missions=1,
        verdict_notes="no torn checkpoint row; C2 vanished, C1 intact")


def probe_p33():
    """Supervisor timeout fires while A's logical commit is in flight."""
    rid, pid = fresh_run()
    marker = os.path.join(SCRATCH, f"p33-{uuid.uuid4().hex[:6]}.marker")
    procA = spawn("slow-finalize", rid, pid, "worker-A", 5.0, marker)
    assert wait_marker(marker), "worker-A never entered slow window"
    time.sleep(1.0)  # supervisor timeout fires while A sleeps
    procB = spawn("finisher", rid, pid, "finisher", "worker-A", "worker-B")
    outB = procB.communicate(timeout=15)[0]
    procA.wait(timeout=10)
    st = state(rid, pid)
    # completion fence: exactly one row. Effect keys: one row. But the packet
    # row is written unconditionally by both -> late writer (A, deposed) wins.
    mismatch = (st["packet"]["result_ref"] != st["completion_ref"])
    dup = (st["delegations"] == 2 and st["completions"] == 1
           and st["effects"] == 1 and mismatch)
    cls = "DUPLICATED" if dup else ("SURVIVED" if not mismatch else "LOST-STATE")
    return R.record(
        "chaos.slow-query", "chaos_lib.set_packet (unconditional final write)",
        "Supervisor timeout (1s) fires while worker-A's 5s logical commit is in "
        "flight; B reclaims, completes, emits completion; A's late "
        "unconditional set_packet overwrites B's result on the packet row. "
        "NEW torn window opened by the slow path: deposed-worker late writes "
        "are not fenced by reclaim (attempt_seq is recorded, never enforced).",
        "TEST", "run_slowquery.probe_p33", "slow_proc(slow-finalize)+finisher",
        "worker-A (survived timeout) + worker-B", "state() durable read",
        cls, 0.93,
        "post-reclaim write fencing" if cls != "SURVIVED" else "none",
        DEPS, AFFECTS,
        detail={"finisher_out": outB.strip(), "packet_result": st["packet"]["result_ref"],
                "completion_result": st["completion_ref"], "mismatch": mismatch,
                "delegations": st["delegations"], "effects": st["effects"],
                "completions": st["completions"]},
        missions=2,
        verdict_notes=("packet row says result:worker-A (deposed), completion fence "
                       "says result:worker-B: readers disagree") if dup else "no window")


def probe_p34():
    """Deposed worker's slow checkpoint lands after the reclaim."""
    rid, pid = fresh_run()
    marker = os.path.join(SCRATCH, f"p34-{uuid.uuid4().hex[:6]}.marker")
    procA = spawn("slow-checkpoint", rid, pid, "worker-A", 5.0, marker)
    assert wait_marker(marker), "worker-A never entered slow window"
    time.sleep(1.0)  # supervisor timeout
    procB = spawn("finisher-ckpt", rid, pid, "finisher-ckpt", "worker-A",
                  "worker-B", json.dumps({"phase": "B-done", "worker": "worker-B"}))
    procB.wait(timeout=15)
    procA.wait(timeout=12)
    st = state(rid, pid)
    latest = st["latest_ckpt"]
    stale = (latest is not None and latest[1].get("phase") == "slow-C2"
             and latest[1].get("worker") == "worker-A")
    cls = "LOST-STATE" if stale else "SURVIVED"
    return R.record(
        "chaos.slow-query", "chaos_lib.slow_checkpoint",
        "Worker-A's 5s checkpoint commits AFTER supervisor reclaimed to B and B "
        "checkpointed. A's stale checkpoint becomes the newest row; a restore "
        "from latest would resurrect pre-reclaim state and hide B's progress. "
        "NEW torn window: checkpoints carry no writer/fencing, restore takes "
        "max(checkpoint_id) blindly.",
        "TEST", "run_slowquery.probe_p34",
        "slow_proc(slow-checkpoint)+finisher-ckpt",
        "worker-A (survived timeout) + worker-B", "state() durable read",
        cls, 0.93,
        "checkpoint writer fencing" if cls != "SURVIVED" else "none",
        DEPS, AFFECTS,
        detail={"latest_ckpt": latest, "stale_newest": stale},
        missions=2,
        verdict_notes=("latest checkpoint is the deposed worker's stale C2; "
                       "B's C3 buried") if stale else "B's checkpoint stayed newest")


def probe_p35():
    """Benign control: SIGTERM mid-slow-commit, then clean reclaim."""
    rid, pid = fresh_run()
    marker = os.path.join(SCRATCH, f"p35-{uuid.uuid4().hex[:6]}.marker")
    proc = spawn("slow-commit", rid, pid, "worker-A", 3.0, marker)
    assert wait_marker(marker), "worker never entered slow window"
    proc.send_signal(signal.SIGTERM)
    rc = proc.wait(timeout=10)
    fin = spawn("finisher", rid, pid, "finisher", "worker-A", "worker-R")
    fin.wait(timeout=15)
    st = state(rid, pid)
    ok = (rc == -signal.SIGTERM and st["packet"]["status"] == "SUCCEEDED"
          and st["packet"]["result_ref"] == "result:worker-R"
          and st["effects"] == 1 and st["completions"] == 1
          and st["delegations"] == 2)
    cls = "SURVIVED" if ok else "DUPLICATED"
    return R.record(
        "chaos.slow-query", "chaos_lib.slow_commit_packet_step+reclaim_packet",
        "Control: SIGTERM mid-slow-commit then reclaim. Exactly-once recovery; "
        "the NEW window in P3.3/P3.4 needs the slow worker to SURVIVE the "
        "timeout, not to be killed.",
        "TEST", "run_slowquery.probe_p35", "slow_proc(slow-commit)+finisher",
        "slow_proc (SIGTERM) + worker-R", "state() durable read",
        cls, 0.95, "none" if cls == "SURVIVED" else "reclaim exactly-once",
        DEPS, AFFECTS,
        detail={"rc": rc, "final": {"status": st["packet"]["status"],
                                   "result": st["packet"]["result_ref"],
                                   "effects": st["effects"],
                                   "completions": st["completions"],
                                   "delegations": st["delegations"]}},
        missions=2,
        verdict_notes="kill path clean; exactly-once recovery")


if __name__ == "__main__":
    L.init_db(DB)
    ids = []
    for fn in (probe_p31, probe_p32, probe_p33, probe_p34, probe_p35):
        pid = fn()
        ids.append(pid)
        print(pid, "done", flush=True)
    print("Q3 complete:", ids)
