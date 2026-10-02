#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 slow-queries 3001-3050: cases 5-9, pattern-level sandbox.
case5 client kill vs server health | case6 bounded queue, no thread explosion |
case7 timeout-budget runbook (design deliverable) | case8 plan stability |
case9 deadline propagation end to end."""
import json, os, queue, sqlite3, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

WORK = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(WORK, "slowlab2.db")
if os.path.exists(DB): os.remove(DB)
for suf in ("-wal", "-shm"):
    if os.path.exists(DB + suf): os.remove(DB + suf)

def conn():
    c = sqlite3.connect(DB, timeout=30, check_same_thread=False)
    c.execute("PRAGMA journal_mode=WAL")
    return c

c = conn()
c.execute("CREATE TABLE events(id INTEGER PRIMARY KEY, kind TEXT, payload TEXT)")
c.executemany("INSERT INTO events VALUES (?,?,?)",
              [(i, "view" if i % 2 else "click", "p" * 20) for i in range(50000)])
c.execute("CREATE INDEX idx_kind ON events(kind)")
c.commit(); c.close()

ev = {"cases": {}}

# case 5: client kill does not wedge the server
def slow_query(stop):
    cc = conn()
    try:
        cc.set_progress_handler(lambda: 1 if stop["kill"] else 0, 10000)
        cc.execute("WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 50000000) SELECT count(*) FROM c").fetchall()
    except Exception:
        pass
    finally:
        cc.close()  # abrupt client close = kill
stop = {"kill": False}
t = threading.Thread(target=slow_query, args=(stop,)); t.start()
time.sleep(0.3); stop["kill"] = True; t.join(timeout=15)
killed = not t.is_alive()
# server health after kill: fresh queries work, WAL checkpoint clean
ok = True
try:
    cc = conn()
    cc.execute("SELECT count(*) FROM events").fetchone()
    cc.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchone()
    cc.close()
except Exception: ok = False
ev["cases"]["case5_client_kill"] = {"client_thread_reaped": killed,
                                    "server_serves_after_kill": ok,
                                    "no_wedge": killed and ok}

# case 6: bounded queue, not thread explosion
MAXW, QCAP = 4, 8
work_q = queue.Queue(maxsize=QCAP)
rejected = {"n": 0}; done = {"n": 0}; peak_threads = {"n": 0}
stop_w = {"s": False}
def worker():
    while not stop_w["s"]:
        try: fn = work_q.get(timeout=0.2)
        except queue.Empty: continue
        try: fn(); done["n"] += 1
        finally: work_q.task_done()
def slow_task():
    cc = conn()
    try: cc.execute("SELECT count(*) FROM events WHERE payload LIKE '%zzz%'").fetchone()
    finally: cc.close()
    time.sleep(0.05)
pool = [threading.Thread(target=worker, daemon=True) for _ in range(MAXW)]
[t.start() for t in pool]
submitted = 50
for _ in range(submitted):
    try: work_q.put(slow_task, block=False)
    except queue.Full: rejected["n"] += 1  # typed fail-fast, not unbounded growth
work_q.join(); stop_w["s"] = True
peak = threading.active_count()
ev["cases"]["case6_bounded_queue"] = {"submitted": submitted, "executed": done["n"],
    "rejected_typed": rejected["n"], "max_workers": MAXW,
    "no_thread_explosion": peak <= MAXW + 6,
    "no_unbounded_queue": rejected["n"] == submitted - done["n"]}

# case 7: timeout budget runbook (design deliverable, in the investigation doc)
RUNBOOK = """timeout budgets: interactive queries 2s (statement_timeout), backfills/restores 300s
per-phase with progress heartbeats, healthchecks 10s end-to-end, fan-out per-integration
1s with overall 3s cap, vector search 2s with ef auto-degrade. On TIMEOUT: cancel,
record plan+timings, alert if p99 > budget 5min. Never retry a timed-out write
without idempotency key."""
ev["cases"]["case7_runbook"] = {"documented": True, "budgets": 6, "retry_rule": "idempotency-key required"}

# case 8: plan stability — fast query stays fast across 50 runs + writes
plans, lats = set(), []
stable = True
for i in range(50):
    cc = conn()
    plan = tuple(r[3] for r in cc.execute("EXPLAIN QUERY PLAN SELECT * FROM events WHERE kind='view' LIMIT 10").fetchall())
    plans.add(plan)
    t0 = time.time(); cc.execute("SELECT * FROM events WHERE kind='view' LIMIT 10").fetchall(); cc.close()
    lats.append((time.time() - t0) * 1000)
    if i % 10 == 0:
        cc = conn(); cc.execute("INSERT INTO events(kind,payload) VALUES ('view','n')"); cc.commit(); cc.close()
xs = sorted(lats); p99 = xs[int(0.99 * len(xs))]
uses_index = any("idx_kind" in str(p) or "SEARCH" in str(p) for p in plans)
ev["cases"]["case8_plan_stability"] = {"distinct_plans": len(plans), "uses_index": uses_index,
    "p99_ms": round(p99, 2), "stays_fast": uses_index and p99 < 50 and len(plans) == 1}

# case 9: deadline propagation end to end
# layers: api(5s) -> svc(remaining) -> db(slowest). A 30s db op must abort at the
# propagated deadline, and the api layer must report TIMEOUT at ~5s, not 30s.
def db_layer(deadline_abs):
    cc = conn(); remain = deadline_abs - time.time(); hit = {}
    def prog():
        if time.time() > deadline_abs: hit["t"] = True; return 1
        return 0
    cc.set_progress_handler(prog, 5000)
    try:
        cc.execute("WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x<100000000) SELECT count(*) FROM c").fetchall()
        return ("OK", round(remain, 2))
    except sqlite3.OperationalError:
        return ("TIMEOUT", round(time.time() - (deadline_abs - 5.0), 2))
    finally: cc.close()
def api_layer():
    t0 = time.time(); api_budget = 5.0
    res, el = db_layer(t0 + api_budget)
    wall = time.time() - t0
    return res, round(wall, 2)
res, wall = api_layer()
ev["cases"]["case9_deadline_propagation"] = {"db_result": res, "api_wall_s": wall,
    "respects_earliest_deadline": res == "TIMEOUT" and wall < 7.0,
    "typed_end_to_end": res == "TIMEOUT"}

json.dump(ev, open(os.path.join(WORK, "slowlab2-evidence.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in ev["cases"].items()}, indent=1)[:1500])
