#!/usr/bin/env python3
"""Q2 follow-up experiment: does deadline+retry converge under 16:2
contention, or livelock? Compares flat-jitter vs exponential backoff, and
a restructured single-borrow unit. Instrumented completion curve."""
import os
import sys
import threading
import time
import random

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g
import run_pool_exhaustion as q

# reuse the tracked-acquire monkeypatch from the runner
_orig = g.BoundedPool.acquire


def _tracked(self, timeout=None):
    pc = _orig(self, timeout)
    if not hasattr(self, "_all"):
        self._all = []
    with self._cond:
        if pc.conn not in self._all:
            self._all.append(pc.conn)
    return pc


g.BoundedPool.acquire = _tracked
THREADS = 16


def unit_exp(pool, run_id, worker, results, lock, t0):
    for attempt in range(30):
        pc1 = None
        try:
            pc1 = pool.acquire(timeout=10)
            c = pc1.conn
            c.execute("BEGIN IMMEDIATE")
            pid, _ = g.new_packet(c, run_id, payload={"exp": worker})
            time.sleep(0.4)
            try:
                pc2 = pool.acquire(timeout=1.5)
            except g.PoolTimeout:
                c.rollback()
                pc1.close()
                pc1 = None
                time.sleep(min(6.0, 0.1 * (2 ** attempt)) + random.uniform(0, 0.1))
                continue
            try:
                g.claim_packet(pc2.conn, pid, worker, 1)
                pc2.conn.commit()
                c.commit()
            finally:
                pc2.close()
            pc1.close()
            with lock:
                results.append(time.monotonic() - t0)
            return True
        except Exception:
            if pc1 is not None:
                try:
                    pc1.close()
                except Exception:
                    pass
            time.sleep(0.2)
    return False


def unit_single_borrow(pool, run_id, worker, results, lock, t0):
    # restructured: audit write on the SAME borrow (no nested acquire)
    for attempt in range(10):
        try:
            with pool.acquire(timeout=10) as pc:
                c = pc.conn
                c.execute("BEGIN IMMEDIATE")
                pid, _ = g.new_packet(c, run_id, payload={"exp1": worker})
                g.claim_packet(c, pid, worker, 1)
                g.apply_effect(c, pid, 1, worker)
                c.commit()
            with lock:
                results.append(time.monotonic() - t0)
            return True
        except Exception:
            time.sleep(0.1 * (attempt + 1))
    return False


def run_case(name, unit_fn, watchdog):
    q.fresh_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref=f"exp-{name}")
    conn.close()
    pool = g.BoundedPool(max_size=2)
    results, lock = [], threading.Lock()
    t0 = time.monotonic()
    threads = [threading.Thread(target=unit_fn,
                                args=(pool, run_id, f"w{i}", results, lock, t0),
                                daemon=True) for i in range(THREADS)]
    for t in threads:
        t.start()
    while time.monotonic() - t0 < watchdog:
        if not any(t.is_alive() for t in threads):
            break
        time.sleep(1.0)
    dt = time.monotonic() - t0
    stuck = sum(1 for t in threads if t.is_alive())
    for c in getattr(pool, "_all", []):
        try:
            c.rollback(); c.close()
        except Exception:
            pass
    curve = sorted(results)
    print(f"{name}: completed={len(curve)}/{THREADS} stuck={stuck} "
          f"wall={dt:.0f}s", flush=True)
    if curve:
        print(f"  completion times (s): " +
              ", ".join(f"{x:.0f}" for x in curve), flush=True)


if __name__ == "__main__":
    run_case("nested+deadline+exp-backoff", unit_exp, 150)
    run_case("single-borrow-restructured", unit_single_borrow, 60)
