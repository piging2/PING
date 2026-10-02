"""FC-4 repro: deposed worker's late unconditional write overwrites the
recovery's packet row after a supervisor-timeout reclaim.

Scenario: worker-A's logical commit is slow (5s). Supervisor timeout fires
at 1s; worker-B reclaims, completes, emits the (fenced) completion.
Worker-A then wakes and its UNCONDITIONAL set_packet overwrites the packet
row: packet says result:worker-A (deposed), completion fence says
result:worker-B. Readers of the two tables disagree.

Exits 0 when the torn window reproduces (mismatch present).
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
rid = L.new_run(conn, prompt_ref="fc4-repro")
pid, is_new = L.new_packet(conn, rid, idem=f"fc4-{uuid.uuid4().hex[:10]}")
assert is_new
conn.close()

marker = os.path.join(LANE, "evidence", f"fc4-{uuid.uuid4().hex[:6]}.marker")
procA = subprocess.Popen(
    [sys.executable, SLOW_PROC, "slow-finalize", DB, rid, pid, "worker-A",
     "5.0", marker],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
t0 = time.time()
while not os.path.exists(marker) and time.time() - t0 < 15:
    time.sleep(0.05)
assert os.path.exists(marker), "worker-A never entered slow window"
time.sleep(1.0)  # supervisor timeout fires while A is in flight
procB = subprocess.Popen(
    [sys.executable, SLOW_PROC, "finisher", DB, rid, pid, "finisher",
     "worker-A", "worker-B"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
print(procB.communicate(timeout=15)[0].strip())
procA.wait(timeout=10)

conn = L.db(DB)
p = L.get_packet(conn, pid)
comp = conn.execute(
    "SELECT result_ref FROM completions WHERE packet_id=?", (pid,)).fetchone()[0]
n_eff, _ = L.count_effects(conn, pid)
n_comp = L.count_completions(conn, pid)
conn.close()

print(f"packet.result_ref     = {p['result_ref']}")
print(f"completion.result_ref = {comp}")
print(f"effects={n_eff} completions={n_comp}")

reproduced = (p["result_ref"] == "result:worker-A"
              and comp == "result:worker-B"
              and n_eff == 1 and n_comp == 1)
print("FC-4 REPRODUCED: deposed worker's late write won the packet row"
      if reproduced else "FC-4 NOT reproduced")
sys.exit(0 if reproduced else 1)
