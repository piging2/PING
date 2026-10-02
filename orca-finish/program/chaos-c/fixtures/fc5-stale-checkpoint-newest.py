"""FC-5 repro: a deposed worker's slow checkpoint lands late and becomes
the newest checkpoint, burying the recovery's checkpoint.

Scenario: worker-A starts a 5s checkpoint, then is deposed: supervisor
timeout fires at 1s, worker-B reclaims and checkpoints its own (newer) state.
Worker-A's stale checkpoint commits last and wins max(checkpoint_id), so a
restore from latest resurrects pre-reclaim state and hides B's progress.

Exits 0 when the torn window reproduces (latest checkpoint is A's stale one).
Scratch only; never production.
"""
import json
import os
import subprocess
import sys
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
LANE = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(LANE, "harness"))
import chaos_lib as L

HARNESS = os.path.join(LANE, "harness")
DB = os.path.join(HARNESS, "chaos-c.db")
SLOW_PROC = os.path.join(HARNESS, "slow_proc.py")
L.init_db(DB)

conn = L.db(DB)
rid = L.new_run(conn, prompt_ref="fc5-repro")
pid, is_new = L.new_packet(conn, rid, idem=f"fc5-{uuid.uuid4().hex[:10]}")
assert is_new
conn.close()

marker = os.path.join(LANE, "evidence", f"fc5-{uuid.uuid4().hex[:6]}.marker")
procA = subprocess.Popen(
    [sys.executable, SLOW_PROC, "slow-checkpoint", DB, rid, pid, "worker-A",
     "5.0", marker],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
t0 = time.time()
while not os.path.exists(marker) and time.time() - t0 < 15:
    time.sleep(0.05)
assert os.path.exists(marker), "worker-A never entered slow window"
time.sleep(1.0)  # supervisor timeout fires while A's checkpoint is in flight
procB = subprocess.Popen(
    [sys.executable, SLOW_PROC, "finisher-ckpt", DB, rid, pid,
     "finisher-ckpt", "worker-A", "worker-B",
     json.dumps({"phase": "B-done", "worker": "worker-B"})],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
procB.wait(timeout=15)
procA.wait(timeout=12)

conn = L.db(DB)
ck = L.latest_checkpoint(conn, rid)
conn.close()

print(f"latest checkpoint: id={ck['checkpoint_id']} state={ck['state']}")
reproduced = (ck["state"].get("phase") == "slow-C2"
              and ck["state"].get("worker") == "worker-A")
print("FC-5 REPRODUCED: deposed worker's stale checkpoint is newest"
      if reproduced else "FC-5 NOT reproduced")
sys.exit(0 if reproduced else 1)
