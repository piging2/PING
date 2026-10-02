#!/usr/bin/env python3
"""FIXTURE FC-4: fixed-size pool + blocking acquire + nested borrow wedges
under contention although every unit is correct. GENERIC CLASS.

Act 1 (WEDGED): BoundedPool(max_size=2); 16 threads run a tx unit that holds
one connection, does work, then needs a second (nested borrow) with a
BLOCKING acquire and no deadline. Hold-and-wait deadlock: two threads each
hold one connection and block forever on the nested borrow; the other 14
block on the first borrow. Zero progress, no error. Bounded retry does not
help: the wedge sits beneath the retry loop.

Act 2 (DEGRADED): the same units with an acquire deadline (1.5s) +
release-and-retry with exponential backoff. The retry churn is
self-sustaining (near-livelock): the two connections circulate among 16
threads and the hold-c1-while-c2-is-free coincidence never arrives.
Deadline+retry is mitigation, not cure.

Act 3 (HEALED): the restructured unit does the audit write on the SAME
borrow (no nested acquire). 16/16 complete in ~2s on the same 2-connection
pool. Eliminating hold-and-wait is the load-bearing fix.

Run: python3 fixtures/fc4-pool-contention-deadlock.py
Expects: WEDGED then DEGRADED then HEALED. Exit 0 iff act 1 wedges and
act 3 heals.
"""
import os
import sys
import threading
import time
import random

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g

THREADS = 16


def track(pool):
    orig = pool.acquire  # bound method of the clean class function

    def tracked(self, timeout=None):
        pc = orig(timeout=timeout)
        if not hasattr(self, "_all"):
            self._all = []
        with self._cond:
            if pc.conn not in self._all:
                self._all.append(pc.conn)
        return pc

    pool.acquire = tracked.__get__(pool, g.BoundedPool)


def shutdown(pool):
    for c in getattr(pool, "_all", []):
        try:
            c.rollback()
        except Exception:
            pass
        try:
            c.close()
        except Exception:
            pass


def unit_nested(pool, run_id, worker, nested_timeout, backoff_fn, results,
                lock, t0, attempts):
    for attempt in range(attempts):
        pc1 = None
        try:
            pc1 = pool.acquire(timeout=10)
            c = pc1.conn
            c.execute("BEGIN IMMEDIATE")
            pid, _ = g.new_packet(c, run_id, payload={"fc4": worker})
            time.sleep(0.4)  # real work while holding the connection
            try:
                pc2 = pool.acquire(timeout=nested_timeout)
            except g.PoolTimeout:
                c.rollback()
                pc1.close()
                pc1 = None
                time.sleep(backoff_fn(attempt))
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
            time.sleep(0.1)
    return False


def unit_single(pool, run_id, worker, results, lock, t0):
    for attempt in range(10):
        try:
            with pool.acquire(timeout=10) as pc:
                c = pc.conn
                c.execute("BEGIN IMMEDIATE")
                pid, _ = g.new_packet(c, run_id, payload={"fc4s": worker})
                g.claim_packet(c, pid, worker, 1)
                g.apply_effect(c, pid, 1, worker)
                c.commit()
            with lock:
                results.append(time.monotonic() - t0)
            return True
        except Exception:
            time.sleep(0.1 * (attempt + 1))
    return False


def run_case(pool, run_id, unit_fn, watchdog):
    results, lock = [], threading.Lock()
    t0 = time.monotonic()
    threads = [threading.Thread(
        target=unit_fn, args=(pool, run_id, f"w{i}", results, lock, t0),
        daemon=True) for i in range(THREADS)]
    for t in threads:
        t.start()
    while time.monotonic() - t0 < watchdog:
        if not any(t.is_alive() for t in threads):
            break
        time.sleep(0.5)
    stuck = sum(1 for t in threads if t.is_alive())
    shutdown(pool)
    return len(results), stuck


def main():
    g.init_db()
    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc4-act1")
    conn.close()
    pool = g.BoundedPool(max_size=2)
    track(pool)
    done, stuck = run_case(
        pool, run_id,
        lambda p, r, w, res, l, t: unit_nested(
            p, r, w, None, lambda a: 0.1, res, l, t, 8), 15)
    wedged = stuck > 0 and done < THREADS
    print(f"WEDGED (completed={done}/{THREADS}, stuck={stuck})" if wedged
          else f"act1: no wedge (completed={done}) UNEXPECTED")

    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc4-act2")
    conn.close()
    pool = g.BoundedPool(max_size=2)
    track(pool)
    done, stuck = run_case(
        pool, run_id,
        lambda p, r, w, res, l, t: unit_nested(
            p, r, w, 1.5, lambda a: min(6.0, 0.1 * (2 ** a)), res, l, t, 30),
        25)
    degraded = done < THREADS // 2
    print(f"DEGRADED (heal_rate={done}/{THREADS} in 25s: deadline+retry "
          f"alone does not heal)" if degraded else
          f"act2: unexpectedly healed ({done}/{THREADS})")

    conn = g.db()
    run_id = g.new_run(conn, prompt_ref="fc4-act3")
    conn.close()
    pool = g.BoundedPool(max_size=2)
    track(pool)
    done, stuck = run_case(pool, run_id, unit_single, 60)
    healed = done == THREADS and stuck == 0
    print(f"HEALED ({done}/{THREADS} via restructured single-borrow unit)"
          if healed else f"act3: HEAL FAILED ({done}/{THREADS})")
    return 0 if (wedged and healed) else 1


if __name__ == "__main__":
    sys.exit(main())
