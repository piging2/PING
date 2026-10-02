#!/usr/bin/env python3
"""C2. WORKER RESTART MID-RUN (real kill -9, real machinery).

Supervisor: runs a control pipeline uninterrupted, then starts worker-1,
SIGKILLs its process group the moment the GENERATE stage starts (kill
lands inside the stage), then starts worker-2 which must resume from the
committed EXTRACT checkpoint, re-execute GENERATE exactly once, and finish
with digests identical to the control run.

Expectations (batch spec 3.2, 4.3):
  - no partial stage output is ever treated as complete
  - resume skips committed stages via idempotency (no recomputation)
  - final digests equal the uninterrupted control
  - attempts bounded (<= 3 per stage)
  - exactly one journal line per stage (no duplicate canonical side effects)
"""
import json
import os
import shutil
import signal
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from chaos_lib import MAX_ATTEMPTS

ROOT = os.path.join(HERE, "work", "c2")


def run_worker(workdir, worker_id, attempts_log, kill_at_marker=None, kill_timeout=180):
    """Start the worker; optionally SIGKILL its process group when a marker appears."""
    p = subprocess.Popen(
        [sys.executable, os.path.join(HERE, "worker_c2.py"),
         workdir, worker_id, attempts_log],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        start_new_session=True, text=True,
    )
    killed = False
    if kill_at_marker:
        deadline = time.time() + kill_timeout
        marker = os.path.join(workdir, "markers", kill_at_marker + ".started")
        while time.time() < deadline:
            if p.poll() is not None:
                break
            if os.path.exists(marker):
                # Kill lands inside the stage: marker is written at stage start,
                # before the Pig call returns and before the commit.
                time.sleep(0.5)
                os.killpg(os.getpgid(p.pid), signal.SIGKILL)
                killed = True
                break
            time.sleep(0.2)
        try:
            p.wait(timeout=30)
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(p.pid), signal.SIGKILL)
            p.wait(timeout=30)
    else:
        try:
            p.wait(timeout=kill_timeout)
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(p.pid), signal.SIGKILL)
            raise RuntimeError("worker %s timed out" % worker_id)
    out = p.stdout.read() if p.stdout else ""
    return {"killed": killed, "returncode": p.returncode, "output_tail": out[-800:]}


def read_json(path):
    with open(path) as f:
        return json.load(f)


def main():
    for sub in ("control", "chaos"):
        d = os.path.join(ROOT, sub)
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d)

    # Control: uninterrupted run.
    cdir = os.path.join(ROOT, "control")
    clog = os.path.join(cdir, "attempts.jsonl")
    r = run_worker(cdir, "w-control", clog, kill_timeout=400)
    control = read_json(os.path.join(cdir, "done-w-control.json"))

    # Chaos: kill worker-1 inside GENERATE, resume with worker-2.
    wdir = os.path.join(ROOT, "chaos")
    wlog = os.path.join(wdir, "attempts.jsonl")
    r1 = run_worker(wdir, "w-1", wlog, kill_at_marker="GENERATE")
    assert r1["killed"], "kill did not land: %s" % r1
    # The killed worker must NOT have produced a done file.
    assert not os.path.exists(os.path.join(wdir, "done-w-1.json")), \
        "killed worker left a done file"
    r2 = run_worker(wdir, "w-2", wlog, kill_timeout=400)
    resumed = read_json(os.path.join(wdir, "done-w-2.json"))

    # Evidence assembly.
    attempts = [json.loads(ln) for ln in open(wlog) if ln.strip()]
    gen_attempts = [e for e in attempts if e["stage"] == "GENERATE"]
    journal = [json.loads(ln) for ln in open(os.path.join(wdir, "journal.jsonl"))
               if ln.strip()]
    index = read_json(os.path.join(wdir, "checkpoints", "index.json"))

    def pig_calls(sub, worker_id):
        d = os.path.join(ROOT, sub, worker_id)
        if not os.path.isdir(d):
            return 0
        return len([f for f in os.listdir(d) if f.startswith("pigcall-")])

    stages = {}
    for st in ("EXTRACT", "GENERATE", "VERIFY"):
        recs = [v for v in index.values() if v["stage"] == st]
        stages[st] = {"committed_records": len(recs),
                      "attempt_in_record": recs[0]["attempt"] if recs else None}

    verdict = (
        r1["killed"]
        and resumed["generate"] == control["generate"]
        and resumed["extract"] == control["extract"]
        and resumed["verify"] == control["verify"]
        and stages["EXTRACT"]["committed_records"] == 1
        and stages["GENERATE"]["committed_records"] == 1
        and stages["VERIFY"]["committed_records"] == 1
        and stages["GENERATE"]["attempt_in_record"] == 2
        and all(s["attempt_in_record"] <= MAX_ATTEMPTS for s in stages.values())
        and len(journal) == 3
        and len({(j["stage"], j["output_digest"]) for j in journal}) == 3
        and "EXTRACT" in resumed["cache_hits"]
        and "GENERATE" not in resumed["cache_hits"]
    )
    result = {
        "experiment": "C2 worker restart mid-run",
        "mode": "real",
        "kill": {"landed": r1["killed"], "signal": "SIGKILL",
                 "point": "inside GENERATE stage (marker at stage start)"},
        "control_digests": {k: control[k] for k in ("extract", "generate", "verify")},
        "resumed_digests": {k: resumed[k] for k in ("extract", "generate", "verify")},
        "resumed_cache_hits": resumed["cache_hits"],
        "stages": stages,
        "generate_attempt_events": gen_attempts,
        "journal_lines": len(journal),
        "journal_stages": sorted({j["stage"] for j in journal}),
        "pig_calls_w1": pig_calls("chaos", "w-1"),
        "pig_calls_w2": pig_calls("chaos", "w-2"),
        "verdict": "PASS" if verdict else "FAIL",
    }
    with open(os.path.join(ROOT, "result.json"), "w") as f:
        json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
