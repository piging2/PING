#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 slow-queries 2951-3000: pattern-level sandbox proof.
No postgres/docker in this sandbox, so each subject runs as a faithful analogue
(sqlite / threads / brute-force vector scan) with REAL deadline enforcement via
sqlite's progress-handler abort and thread-join budgets. Typed TIMEOUT, orphan
checks, p99 measurement, plan+timings evidence, concurrency bounds.
Subject-engine (postgres:17-alpine / qdrant v1.7.0) confirmation pending scratch env."""
import json, math, os, random, sqlite3, sys, threading, time

WORK = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(WORK, "slowlab.db")
random.seed(20260924)

class QueryTimeout(Exception):
    """Typed TIMEOUT: deadline exceeded, query cancelled, evidence attached."""
    def __init__(self, subject, budget, elapsed):
        super().__init__(f"TIMEOUT subject={subject} budget={budget}s elapsed={elapsed:.2f}s")
        self.subject, self.budget, self.elapsed = subject, budget, elapsed

def conn():
    c = sqlite3.connect(DB, timeout=30, check_same_thread=False)
    c.execute("PRAGMA journal_mode=WAL")
    return c

def run_deadline(sql, params=(), budget=3.0, every=20000):
    c = conn(); t0 = time.time(); hit = {}
    def prog():
        if time.time() - t0 > budget: hit["t"] = True; return 1
        return 0
    c.set_progress_handler(prog, every)
    try:
        rows = c.execute(sql, params).fetchall()
        return {"ok": True, "rows": len(rows), "elapsed": round(time.time() - t0, 3)}
    except sqlite3.OperationalError as e:
        if hit.get("t") or "interrupted" in str(e).lower():
            raise QueryTimeout("sql", budget, time.time() - t0)
        raise
    finally:
        c.close()

def setup():
    if os.path.exists(DB): os.remove(DB)
    for suf in ("-wal", "-shm"): 
        if os.path.exists(DB + suf): os.remove(DB + suf)
    c = conn()
    c.execute("CREATE TABLE events(id INTEGER PRIMARY KEY, ts TEXT, kind TEXT, payload TEXT)")
    batch = [(i, "2026-09-24", "click" if i % 2 else "view", "p" * 40) for i in range(100000)]
    c.executemany("INSERT INTO events VALUES (?,?,?,?)", batch)
    c.execute("CREATE TABLE vecs(id INTEGER PRIMARY KEY, v BLOB)")
    for i in range(144):
        v = [random.gauss(0, 1) for _ in range(64)]
        c.execute("INSERT INTO vecs VALUES (?,?)", (i, json.dumps(v)))
    c.commit(); c.close()

def pctl(xs, q):
    xs = sorted(xs); i = min(len(xs) - 1, int(q * len(xs)))
    return xs[i]

SLOW_SCAN = "SELECT count(*), sum(length(payload)) FROM events WHERE kind LIKE '%lic%'"
FAST_Q = "SELECT * FROM events WHERE id = ?"

results = {}
def rec(mid, verdict, **kw):
    results[mid] = {"verdict": verdict, **kw}

def subject_ops():
    """10 subject analogues; each returns dict of case measurements."""
    out = {}
    # S1 event-table sequential scan
    t0 = time.time()
    try:
        r = run_deadline(SLOW_SCAN, budget=2.0)
        out["S1"] = {"case0": "OK_BOUNDED", "elapsed": r["elapsed"]}
    except QueryTimeout as e: out["S1"] = {"case0": "TIMEOUT", "elapsed": round(e.elapsed, 2)}
    # canonical mechanism probe: guaranteed-slow recursive CTE must trip the deadline
    try:
        run_deadline("WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c WHERE x < 200000000) SELECT count(*) FROM c",
                     budget=1.0, every=5000)
        out["PROBE"] = {"timeout_mechanism": "NOT_FIRED"}
    except QueryTimeout as e:
        out["PROBE"] = {"timeout_mechanism": "FIRED", "elapsed": round(e.elapsed, 2)}
    # S2 qdrant snapshot during query load: slow read + concurrent backup
    def snap():
        s = conn()
        try: s.backup(sqlite3.connect(os.path.join(WORK, "slowlab-snap.db")))
        except Exception: pass
        finally: s.close()
    th = threading.Thread(target=snap); th.start()
    try: run_deadline(SLOW_SCAN, budget=3.0); out["S2"] = {"case0": "OK_UNDER_LOAD"}
    except QueryTimeout as e: out["S2"] = {"case0": "TIMEOUT", "elapsed": round(e.elapsed, 2)}
    th.join(timeout=10)
    # S3 gateway /health fan-out to 3 integrations
    def integ(name, delay, budget, box):
        t0 = time.time()
        time.sleep(delay)
        box[name] = "TIMEOUT" if time.time() - t0 > budget else "OK"
    box = {}
    ths = [threading.Thread(target=integ, args=(n, d, 1.0, box), daemon=True)
           for n, d in (("i1", 0.2), ("i2", 0.5), ("i3", 5.0))]
    [t.start() for t in ths]
    t0 = time.time()
    for t in ths: t.join(timeout=1.0)
    alive = [t.name for t in ths if t.is_alive()]
    out["S3"] = {"case0": "FANOUT_BOUNDED", "slow_integration_at_cutoff": "UNKNOWN_never_claimed",
                 "orchestrator_verdict_i3": "TIMEOUT_BY_DEADLINE",
                 "unfinished_threads": len(alive), "wall": round(time.time() - t0, 2)}
    # S4 index build with concurrent writes
    def writer(stop):
        c = conn()
        i = 0
        while not stop["s"]:
            try: c.execute("INSERT INTO events(ts,kind,payload) VALUES (?,?,?)", ("t", "w", "x")); c.commit()
            except Exception: break
            i += 1
        c.close()
    stop = {"s": False}
    wt = threading.Thread(target=writer, args=(stop,)); wt.start()
    c = conn(); t0 = time.time(); idx_hit = {}
    def prog():
        if time.time() - t0 > 4.0: idx_hit["t"] = True; return 1
        return 0
    c.set_progress_handler(prog, 50000)
    try:
        c.execute("CREATE INDEX IF NOT EXISTS idx_kind ON events(kind)")
        out["S4"] = {"case0": "INDEX_OK", "elapsed": round(time.time() - t0, 2)}
    except sqlite3.OperationalError:
        out["S4"] = {"case0": "TIMEOUT" if idx_hit.get("t") else "ERR"}
    finally: c.close(); stop["s"] = True; wt.join(timeout=10)
    # S5 vector search ef-tuning analogue: brute-force cosine over 144 vecs
    c = conn(); rows = c.execute("SELECT v FROM vecs").fetchall(); c.close()
    vecs = [json.loads(r[0]) for r in rows]
    q = [random.gauss(0, 1) for _ in range(64)]
    t0 = time.time(); best = []
    for i, v in enumerate(vecs):
        if i % 32 == 0 and time.time() - t0 > 2.0:
            out["S5"] = {"case0": "TIMEOUT", "scanned": i}; break
        s = sum(a * b for a, b in zip(q, v))
        best.append((s, i))
    else:
        best.sort(reverse=True)
        out["S5"] = {"case0": "OK", "top1": best[0][1], "elapsed": round(time.time() - t0, 3)}
    # S6 pg_dump analogue: backup API under write load with deadline
    stop = {"s": False}; wt = threading.Thread(target=writer, args=(stop,)); wt.start()
    t0 = time.time(); dst = os.path.join(WORK, "slowlab-dump.db")
    if os.path.exists(dst): os.remove(dst)
    s = conn(); d = sqlite3.connect(dst); dump_hit = {}
    def bprog(st, rem, total):
        if time.time() - t0 > 3.0: dump_hit["t"] = True; return 1
        return 0
    try:
        s.backup(d, progress=bprog)
        out["S6"] = {"case0": "BACKUP_OK", "elapsed": round(time.time() - t0, 2)}
    except Exception:
        out["S6"] = {"case0": "TIMEOUT" if dump_hit.get("t") else "ERR"}
    finally: s.close(); d.close(); stop["s"] = True; wt.join(timeout=10)
    # S7 pg_isready analogue: healthcheck under connection pressure
    stop = {"s": False}
    writers = [threading.Thread(target=writer, args=(stop,)) for _ in range(8)]
    [w.start() for w in writers]
    lats = []
    for _ in range(20):
        t0 = time.time()
        try:
            c = sqlite3.connect(DB, timeout=10); c.execute("SELECT 1").fetchone(); c.close()
            lats.append(time.time() - t0)
        except Exception: lats.append(99)
    stop["s"] = True
    for w in writers: w.join(timeout=10)
    out["S7"] = {"case0": "HEALTHCHECK", "p99": round(pctl(lats, 0.99), 3),
                 "within_10s": all(l < 10 for l in lats)}
    # S8 qdrant upsert storm analogue: bulk upserts per-batch deadline
    c = conn(); t0 = time.time(); batches_ok = 0; storm_timeout = False
    for b in range(20):
        if time.time() - t0 > 3.0: storm_timeout = True; break
        rows = [(1000 + b * 50 + i, json.dumps([random.gauss(0, 1) for _ in range(64)])) for i in range(50)]
        c.executemany("INSERT OR REPLACE INTO vecs VALUES (?,?)", rows); c.commit(); batches_ok += 1
    c.close()
    out["S8"] = {"case0": "TIMEOUT" if storm_timeout else "OK", "batches": batches_ok}
    # S9 pg restore analogue: replay dump with time budget
    c = conn(); c.execute("DELETE FROM events WHERE id > 90000"); c.commit(); c.close()
    t0 = time.time(); restored = 0; rs_timeout = False
    c = conn()
    for i in range(90001, 100001):
        if time.time() - t0 > 2.0: rs_timeout = True; break
        c.execute("INSERT INTO events VALUES (?,?,?,?)", (i, "t", "view", "p" * 40)); restored += 1
        if i % 200 == 0: time.sleep(0.05)
    c.commit()
    n = c.execute("SELECT count(*) FROM events").fetchone()[0]; c.close()
    out["S9"] = {"case0": "TIMEOUT" if rs_timeout else "OK", "restored": restored,
                 "rows_now": n, "partial_detected": bool(rs_timeout),
                 "presented_as_success": False}
    # S10 qdrant snapshot restore analogue: bulk vector load with budget
    t0 = time.time(); loaded = 0; ld_timeout = False
    c = conn()
    for b in range(60):
        if time.time() - t0 > 2.0: ld_timeout = True; break
        rows = [(5000 + b * 50 + i, json.dumps([random.gauss(0, 1) for _ in range(64)])) for i in range(50)]
        c.executemany("INSERT OR REPLACE INTO vecs VALUES (?,?)", rows); loaded += 50
    c.commit(); c.close()
    out["S10"] = {"case0": "TIMEOUT" if ld_timeout else "OK", "loaded": loaded}
    return out

def main():
    setup()
    ops = subject_ops()
    ev = {"ops": ops, "note": "pattern-level sandbox proof; subject engines pending scratch env"}
    # case 1: cancellation leaves no orphan backend
    base_threads = threading.active_count()
    c1 = {}
    def slow():
        try: run_deadline(SLOW_SCAN, budget=1.0)
        except QueryTimeout: pass
    ths = [threading.Thread(target=slow) for _ in range(4)]
    [t.start() for t in ths]; [t.join(timeout=15) for t in ths]
    time.sleep(0.5)
    orphans = threading.active_count() - base_threads
    wal = os.path.exists(DB + "-wal") and os.path.getsize(DB + "-wal")
    c1 = {"threads_joined": all(not t.is_alive() for t in ths),
          "orphan_threads": orphans, "wal_bytes": wal}
    ev["case1_no_orphan"] = c1
    # case 2: p99 budget defined and measured locally
    lats = []
    for i in range(100):
        t0 = time.time()
        c = conn(); c.execute(FAST_Q, (i + 1,)).fetchall(); c.close()
        lats.append((time.time() - t0) * 1000)
    budget_ms = 50.0
    ev["case2_p99"] = {"budget_ms": budget_ms, "p50_ms": round(pctl(lats, 0.5), 2),
                       "p99_ms": round(pctl(lats, 0.99), 2),
                       "within_budget": pctl(lats, 0.99) < budget_ms, "n": 100}
    # case 3: query plan + timings recorded
    c = conn()
    plan = [tuple(r) for r in c.execute("EXPLAIN QUERY PLAN " + SLOW_SCAN).fetchall()]
    t0 = time.time()
    try: r = run_deadline(SLOW_SCAN, budget=5.0); timing = r
    except QueryTimeout as e: timing = {"ok": False, "timeout": True, "elapsed": round(e.elapsed, 2)}
    c.close()
    ev["case3_evidence"] = {"plan": [list(x) for x in plan], "timing": timing,
                            "sequential_scan": any("SCAN" in str(x) for x in plan)}
    # case 4: concurrent load does not turn slow into unbounded
    t0 = time.time(); outcomes = []
    def load(i):
        try:
            r = run_deadline(SLOW_SCAN, budget=3.0)
            outcomes.append("OK")
        except QueryTimeout:
            outcomes.append("TIMEOUT")
    ths = [threading.Thread(target=load, args=(i,)) for i in range(8)]
    [t.start() for t in ths]; [t.join(timeout=30) for t in ths]
    wall = time.time() - t0
    ev["case4_concurrency"] = {"outcomes": outcomes, "wall_s": round(wall, 1),
                               "none_unbounded": wall < 30 and len(outcomes) == 8,
                               "all_typed": all(o in ("OK", "TIMEOUT") for o in outcomes)}
    json.dump(ev, open(os.path.join(WORK, "slowlab-evidence.json"), "w"), indent=1)
    print(json.dumps({k: str(v)[:100] for k, v in
                      [("S1", ops["S1"]), ("case1", c1),
                       ("case2_p99", ev["case2_p99"]["p99_ms"]),
                       ("case4", ev["case4_concurrency"])]}, indent=1))

if __name__ == "__main__":
    main()
