#!/usr/bin/env python3
"""CHAOS-B Q2: pool exhaustion. BoundedPool(max_size=2), 16 concurrent tx
units with bounded retry.

Suites:
  q2a: single-acquire units (no hold-and-wait possible) -> expect SURVIVED,
       measure p99 acquisition latency under 16:2 contention.
  q2b: nested-acquire units (hold c1, need c2) with BLOCKING acquire and no
       deadline -> expect WEDGED (hold-and-wait deadlock) even though every
       unit is correct and retry-armed. Control: same units, max_size=32 ->
       expect SURVIVED (proves the units are correct; the pool size wedges).
  q2c: nested-acquire units with acquire DEADLINE + release-and-retry ->
       expect SURVIVED (bounded escape heals); measure heal rate, p99.

One probe record per rep. Each tx unit counts as one mission.
"""
import os
import sys
import threading
import time
import random

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g
import record as R

THREADS = 16
WATCHDOG_S = 25
REPS = 3

AFFECTS = ["impl-lane", "orca-b", "chaos-c"]


def fresh_db():
    if os.path.exists(g.DB_PATH):
        os.remove(g.DB_PATH)
    for suf in ("-wal", "-shm"):
        p = g.DB_PATH + suf
        if os.path.exists(p):
            os.remove(p)
    g.init_db()


def unit_single(pool, run_id, worker, stats):
    """One tx unit: single pool borrow, bounded retry. Correct by construction."""
    last = None
    for attempt in range(5):
        try:
            with pool.acquire(timeout=10) as pc:
                c = pc.conn
                c.execute("BEGIN IMMEDIATE")
                pid, _ = g.new_packet(c, run_id, payload={"q2a": worker})
                g.claim_packet(c, pid, worker, 1)
                g.apply_effect(c, pid, 1, worker)
                c.commit()
            stats["ok"] += 1
            return True
        except (g.PoolTimeout, Exception) as e:
            last = e
            stats["retries"] += 1
            time.sleep(0.05 * (attempt + 1))
    stats["failed"] += 1
    return False


def unit_nested(pool, run_id, worker, stats, nested_timeout, hold_s=0.5,
                max_retries=12):
    """One tx unit: borrows c1, does work, then needs c2 (nested borrow)
    for the audit write. Correct by construction: with a big enough pool it
    always completes. With max_size=2 and blocking nested acquire, 16 of
    these deadlock by hold-and-wait."""
    for attempt in range(max_retries):
        pc1 = None
        try:
            pc1 = pool.acquire(timeout=10)
            c = pc1.conn
            c.execute("BEGIN IMMEDIATE")
            pid, _ = g.new_packet(c, run_id, payload={"q2": worker})
            time.sleep(hold_s)  # real work while holding c1
            try:
                pc2 = pool.acquire(timeout=nested_timeout)
            except g.PoolTimeout:
                c.rollback()
                pc1.close()
                pc1 = None
                stats["retries"] += 1
                time.sleep(random.uniform(0.05, 0.3))
                continue
            try:
                g.claim_packet(pc2.conn, pid, worker, 1)
                g.apply_effect(pc2.conn, pid, 1, worker)
                pc2.conn.commit()
                c.commit()
            finally:
                pc2.close()
            pc1.close()
            stats["ok"] += 1
            return True
        except g.PoolTimeout:
            stats["retries"] += 1
            time.sleep(random.uniform(0.05, 0.3))
        except Exception as e:  # noqa: BLE001 - probe records, never hides
            stats["errors"].append(repr(e)[:120])
            stats["retries"] += 1
            time.sleep(0.1)
        finally:
            if pc1 is not None:
                try:
                    pc1.close()
                except Exception:
                    pass
    stats["failed"] += 1
    return False


def run_threads(fn, n):
    stats = {"ok": 0, "failed": 0, "retries": 0, "errors": []}
    lock = threading.Lock()

    def wrap(i):
        s = {"ok": 0, "failed": 0, "retries": 0, "errors": []}
        fn(i, s)
        with lock:
            for k in ("ok", "failed", "retries"):
                stats[k] += s[k]
            stats["errors"].extend(s["errors"])

    threads = [threading.Thread(target=wrap, args=(i,), daemon=True)
               for i in range(n)]
    t0 = time.monotonic()
    for t in threads:
        t.start()
    deadline = time.monotonic() + WATCHDOG_S
    alive = n
    while alive and time.monotonic() < deadline:
        time.sleep(0.5)
        alive = sum(1 for t in threads if t.is_alive())
    dt = time.monotonic() - t0
    return stats, threads, alive, dt


def shutdown_pool(pool):
    """Force-close every connection the pool ever made (releases sqlite
    locks held by wedged daemon threads so the next rep starts clean)."""
    with pool._cond:
        conns = list(pool._free)
        pool._free = []
    # _all registry: walk via total-created conns is not tracked; instead
    # close free ones here and rely on GC for checked-out ones after
    # rollback below. Track via pool._all if present.
    for c in getattr(pool, "_all", []):
        try:
            c.rollback()
        except Exception:
            pass
        try:
            c.close()
        except Exception:
            pass


def q2a():
    for rep in range(REPS):
        fresh_db()
        conn = g.db()
        run_id = g.new_run(conn, prompt_ref=f"q2a-baseline rep{rep}")
        conn.close()
        pool = g.BoundedPool(max_size=2)
        stats, threads, alive, dt = run_threads(
            lambda i, s: unit_single(pool, run_id, f"w{i}", s), THREADS)
        for t in threads:
            t.join(timeout=5)
        p99 = pool.p99_acquire_latency()
        ok = stats["ok"] == THREADS and alive == 0
        R.record(
            domain="chaos.pool-exhaustion", component="BoundedPool(max_size=2)",
            claim=("Q2a: 16 single-acquire tx units with bounded retry against "
                   "a 2-connection pool: all complete; contention shows up as "
                   "latency, not loss."),
            evidence="TEST", caller="run_pool_exhaustion.q2a",
            callee="BoundedPool.acquire/unit_single",
            writer=f"16 threads x rep{rep}", reader="watchdog join",
            classification="SURVIVED" if ok else "WEDGED",
            confidence=0.95, broken_boundary="none",
            dependencies=["bounded retry", "single-borrow units"],
            affects_agents=AFFECTS, missions=THREADS,
            detail={"rep": rep, "threads": THREADS, "max_size": 2,
                    "completed": stats["ok"], "failed": stats["failed"],
                    "retries": stats["retries"], "errors": stats["errors"][:3],
                    "p99_acquire_ms": round(p99 * 1000, 1),
                    "wall_s": round(dt, 1)},
            verdict_notes=("all 16 units completed; p99 acquisition latency "
                           "measures the contention cost" if ok else
                           "UNEXPECTED: baseline wedged"))


def q2b():
    for rep in range(REPS):
        # --- wedge arm: max_size=2, blocking nested acquire (no deadline) ---
        fresh_db()
        conn = g.db()
        run_id = g.new_run(conn, prompt_ref=f"q2b-wedge rep{rep}")
        conn.close()
        pool = g.BoundedPool(max_size=2)
        stats, threads, alive, dt = run_threads(
            lambda i, s: unit_nested(pool, run_id, f"w{i}", s,
                                    nested_timeout=None), THREADS)
        wedged = alive > 0
        shutdown_pool(pool)
        R.record(
            domain="chaos.pool-exhaustion",
            component="BoundedPool(max_size=2) + nested borrow",
            claim=("Q2b: 16 nested-acquire tx units (hold c1, need c2) with "
                   "blocking acquire and no deadline wedge by hold-and-wait "
                   "deadlock although every unit is correct and retry-armed: "
                   "the wedge sits beneath the retry loop."),
            evidence="TEST", caller="run_pool_exhaustion.q2b",
            callee="BoundedPool.acquire(unit_nested)",
            writer=f"16 threads x rep{rep}", reader="watchdog 25s join",
            classification="WEDGED" if wedged else "SURVIVED",
            confidence=0.95,
            broken_boundary=("pool acquisition" if wedged else "none"),
            dependencies=["nested borrow pattern", "blocking acquire"],
            affects_agents=AFFECTS, missions=THREADS,
            detail={"rep": rep, "threads": THREADS, "max_size": 2,
                    "completed": stats["ok"], "stuck_threads": alive,
                    "retries": stats["retries"],
                    "watchdog_s": WATCHDOG_S, "wall_s": round(dt, 1)},
            verdict_notes=("hold-and-wait deadlock: threads held one conn "
                           "each and blocked forever on the nested borrow; "
                           "zero progress, no error" if wedged else
                           "no wedge this rep (serialization won the race)"))
        # --- control arm: same units, max_size=32 -> must all complete ---
        fresh_db()
        conn = g.db()
        run_id = g.new_run(conn, prompt_ref=f"q2b-control rep{rep}")
        conn.close()
        pool = g.BoundedPool(max_size=32)
        stats, threads, alive, dt = run_threads(
            lambda i, s: unit_nested(pool, run_id, f"w{i}", s,
                                    nested_timeout=None), THREADS)
        for t in threads:
            t.join(timeout=30)
        ok = stats["ok"] == THREADS
        R.record(
            domain="chaos.pool-exhaustion",
            component="BoundedPool(max_size=32) + nested borrow",
            claim=("Q2b-control: identical nested-acquire units against a "
                   "32-connection pool all complete: the units are correct, "
                   "the 2-connection pool is what wedges."),
            evidence="TEST", caller="run_pool_exhaustion.q2b_control",
            callee="BoundedPool.acquire(unit_nested)",
            writer=f"16 threads x rep{rep}", reader="thread join",
            classification="SURVIVED" if ok else "WEDGED",
            confidence=0.95, broken_boundary="none",
            dependencies=["nested borrow pattern"],
            affects_agents=AFFECTS, missions=THREADS,
            detail={"rep": rep, "threads": THREADS, "max_size": 32,
                    "completed": stats["ok"], "failed": stats["failed"],
                    "retries": stats["retries"], "wall_s": round(dt, 1)},
            verdict_notes=("control passed: units correct, pool size is the "
                           "wedge cause" if ok else "CONTROL FAILED"))


def q2c():
    for rep in range(REPS):
        fresh_db()
        conn = g.db()
        run_id = g.new_run(conn, prompt_ref=f"q2c-heal rep{rep}")
        conn.close()
        pool = g.BoundedPool(max_size=2)
        stats, threads, alive, dt = run_threads(
            lambda i, s: unit_nested(pool, run_id, f"w{i}", s,
                                    nested_timeout=1.5), THREADS)
        for t in threads:
            t.join(timeout=120)
        p99 = pool.p99_acquire_latency()
        healed = stats["ok"] == THREADS
        R.record(
            domain="chaos.pool-exhaustion",
            component="BoundedPool(max_size=2) + acquire deadline",
            claim=("Q2c: nested-acquire units with an acquire deadline and "
                   "release-and-retry heal under 16:2 contention: every unit "
                   "completes, at the cost of retries and latency."),
            evidence="TEST", caller="run_pool_exhaustion.q2c",
            callee="BoundedPool.acquire(timeout)/unit_nested",
            writer=f"16 threads x rep{rep}", reader="thread join",
            classification="SURVIVED" if healed else "WEDGED",
            confidence=0.93,
            broken_boundary="none" if healed else "pool acquisition",
            dependencies=["acquire deadline", "release-before-retry",
                          "bounded retry budget"],
            affects_agents=AFFECTS, missions=THREADS,
            detail={"rep": rep, "threads": THREADS, "max_size": 2,
                    "nested_acquire_timeout_s": 1.5,
                    "completed": stats["ok"], "failed": stats["failed"],
                    "heal_rate": round(stats["ok"] / THREADS, 3),
                    "retries": stats["retries"],
                    "pool_timeouts": pool.timeouts,
                    "p99_acquire_ms": round(p99 * 1000, 1),
                    "wall_s": round(dt, 1)},
            verdict_notes=("bounded escape heals: all 16 completed via "
                           "deadline+retry" if healed else
                           "heal FAILED: some units exhausted retry budget"))


if __name__ == "__main__":
    # track every created connection so wedged reps can be shut down cleanly
    _orig_acquire = g.BoundedPool.acquire

    def _tracked_acquire(self, timeout=None):
        pc = _orig_acquire(self, timeout)
        if not hasattr(self, "_all"):
            self._all = []
        with self._cond:
            if pc.conn not in self._all:
                self._all.append(pc.conn)
        return pc

    g.BoundedPool.acquire = _tracked_acquire
    q2a()
    q2b()
    q2c()
    print("Q2 done")
