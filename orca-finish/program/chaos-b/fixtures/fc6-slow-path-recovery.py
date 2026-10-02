#!/usr/bin/env python3
"""FIXTURE FC-6: slow-path recovery races. GENERIC CLASS.

Slowness does not invent torn-state mechanisms; it widens every recovery
window from ms to seconds, turning rare races into certainties.

Act 1 (DOUBLE-RECOVERY): worker holds a 2s slow commit; supervisor timeout
(1s) declares it dead and re-runs the unit with a non-idempotent effect.
Both the worker's commit and the recovery land: 2 effect rows.
Act 2 (ABSORBED): same race with an idempotent effect key (INSERT OR
IGNORE): 1 row.
Act 3 (ORPHANED): real SIGKILL in a forked child between the claim commit
and the effect commit: packet CLAIMED, 0 effects, no reaper: lost.
Act 4 (REAPED): same kill, then the reaper finishes the orphan: 1 effect.
Act 5 (TORN-CHECKPOINT): SIGKILL in the dispatch->mark gap of an outbox
loop: the dispatched-but-unmarked row is re-dispatched on redelivery.
Act 6 (ABSORBED): idempotent dispatch key: redelivery is a no-op.

Run: python3 fixtures/fc6-slow-path-recovery.py
Expects: DOUBLE-RECOVERY, ABSORBED, ORPHANED, REAPED, TORN-CHECKPOINT,
ABSORBED. Exit 0 iff all six behave.
"""
import os
import sys
import time
import signal
import threading
import multiprocessing as mp
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
import chaos_lib as g

SLOW_S = 2.0
TIMEOUT_S = 1.0


def fresh():
    for suf in ("", "-wal", "-shm"):
        p = g.DB_PATH + suf
        if os.path.exists(p):
            os.remove(p)
    g.init_db()
    conn = g.db()
    rid = g.new_run(conn, prompt_ref="fc6")
    conn.close()
    return rid


def n_effects(pid):
    conn = g.db()
    n = conn.execute("SELECT COUNT(*) FROM effects WHERE packet_id=?",
                     (str(pid),)).fetchone()[0]
    conn.close()
    return n


def act_double_recovery(idempotent):
    rid = fresh()
    conn = g.db()
    pid, _ = g.new_packet(conn, rid, payload={"a": 1})
    conn.close()
    done = threading.Event()

    def worker():
        c = g.db()
        g.claim_packet(c, pid, "worker", 1)
        c.execute("BEGIN")
        if idempotent:
            c.execute("INSERT OR IGNORE INTO effects(effect_key, packet_id,"
                      " step, worker_id) VALUES (?,?,?,?)",
                      (f"effect:{pid}:1", str(pid), 1, "worker"))
        else:
            c.execute("INSERT INTO effects(effect_key, packet_id, step,"
                      " worker_id) VALUES (?,?,?,?)",
                      (f"plain:{pid}:{uuid.uuid4().hex[:6]}", str(pid), 1,
                       "worker"))
        time.sleep(SLOW_S)
        c.commit()
        c.close()
        done.set()

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    time.sleep(TIMEOUT_S)  # supervisor declares the worker dead
    c = g.db()
    c.execute("UPDATE packets SET status='ENQUEUED', claimed_by=NULL"
              " WHERE packet_id=?", (str(pid),))
    c.commit()
    g.claim_packet(c, pid, "supervisor", 1)
    if idempotent:
        c.execute("INSERT OR IGNORE INTO effects(effect_key, packet_id, step,"
                  " worker_id) VALUES (?,?,?,?)",
                  (f"effect:{pid}:1", str(pid), 1, "supervisor"))
    else:
        c.execute("INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                  " VALUES (?,?,?,?)",
                  (f"plain:{pid}:{uuid.uuid4().hex[:6]}", str(pid), 1,
                   "supervisor"))
    c.commit()
    c.close()
    t.join(timeout=10)
    return n_effects(pid)


def kill_child(shape):
    rid = fresh()
    conn = g.db()
    pid, _ = g.new_packet(conn, rid, payload={"a": 3})
    conn.close()

    def child():
        c = g.db()
        if shape == "split":
            g.claim_packet(c, pid, "w", 1)
        else:
            c.execute("BEGIN")
            c.execute("UPDATE packets SET status='CLAIMED', claimed_by='w'"
                      " WHERE packet_id=?", (str(pid),))
        if shape == "split":
            c.execute("BEGIN")
        c.execute("INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                  " VALUES (?,?,?,?)", (f"effect:{pid}:1", str(pid), 1, "w"))
        time.sleep(SLOW_S)
        c.commit()
        c.close()

    p = mp.get_context("fork").Process(target=child, daemon=True)
    p.start()
    time.sleep(1.0)
    os.kill(p.pid, signal.SIGKILL)
    p.join(timeout=10)
    try:
        os.waitpid(p.pid, 0)
    except ChildProcessError:
        pass
    return pid


def main():
    ok = True

    n = act_double_recovery(idempotent=False)
    print(f"DOUBLE-RECOVERY (effect rows={n})" if n == 2
          else f"act1 UNEXPECTED (rows={n})")
    ok &= n == 2

    n = act_double_recovery(idempotent=True)
    print(f"ABSORBED (effect rows={n})" if n == 1
          else f"act2 UNEXPECTED (rows={n})")
    ok &= n == 1

    pid = kill_child("split")
    n = n_effects(pid)
    c = g.db()
    st = c.execute("SELECT status FROM packets WHERE packet_id=?",
                   (str(pid),)).fetchone()[0]
    c.close()
    orphan = st == "CLAIMED" and n == 0
    print(f"ORPHANED (packet={st}, effects={n})" if orphan
          else f"act3 UNEXPECTED (packet={st}, effects={n})")
    ok &= orphan

    # reaper finishes the orphan left above
    c = g.db()
    c.execute("INSERT INTO effects(effect_key, packet_id, step, worker_id)"
              " VALUES (?,?,?,?)", (f"effect:{pid}:1", str(pid), 1, "reaper"))
    c.execute("UPDATE packets SET status='COMPLETED' WHERE packet_id=?",
              (str(pid),))
    c.commit()
    c.close()
    n = n_effects(pid)
    print(f"REAPED (effects={n})" if n == 1 else f"act4 UNEXPECTED ({n})")
    ok &= n == 1

    # torn checkpoint: outbox dispatch gap
    rid = fresh()
    conn = g.db()
    pids = [g.new_packet(conn, rid, kind="outbox",
                         payload={"i": i})[0] for i in range(6)]
    conn.close()

    def dispatcher():
        c = g.db()
        for p in pids:
            c.execute("INSERT INTO effects(effect_key, packet_id, step,"
                      " worker_id) VALUES (?,?,?,?)",
                      (f"disp:{p}:{uuid.uuid4().hex[:6]}", str(p), 1, "d"))
            c.commit()
            time.sleep(0.2)
            c.execute("UPDATE packets SET status='DISPATCHED'"
                      " WHERE packet_id=?", (str(p),))
            c.commit()
        c.close()

    p = mp.get_context("fork").Process(target=dispatcher, daemon=True)
    p.start()
    while True:
        c = g.db()
        got = c.execute("SELECT COUNT(*) FROM effects WHERE step=1"
                        ).fetchone()[0]
        c.close()
        if got >= 3:
            break
        time.sleep(0.05)
    time.sleep(0.1)  # inside the dispatch->mark gap of row 3
    os.kill(p.pid, signal.SIGKILL)
    p.join(timeout=10)
    try:
        os.waitpid(p.pid, 0)
    except ChildProcessError:
        pass
    c = g.db()
    pending = [r[0] for r in c.execute(
        "SELECT packet_id FROM packets WHERE run_id=? AND kind='outbox'"
        " AND status != 'DISPATCHED'", (str(rid),)).fetchall()]
    c.close()
    for pp in pending:  # naive redelivery
        c = g.db()
        c.execute("INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                  " VALUES (?,?,?,?)",
                  (f"disp:{pp}:{uuid.uuid4().hex[:6]}", str(pp), 1, "redeliv"))
        c.execute("UPDATE packets SET status='DISPATCHED' WHERE packet_id=?",
                  (str(pp),))
        c.commit()
        c.close()
    dupes = 0
    for pp in pids:
        c = g.db()
        cnt = c.execute("SELECT COUNT(*) FROM effects WHERE packet_id=?",
                        (str(pp),)).fetchone()[0]
        c.close()
        dupes += cnt > 1
    print(f"TORN-CHECKPOINT (re-dispatched rows={dupes})" if dupes >= 1
          else "act5 UNEXPECTED (no torn row)")
    ok &= dupes >= 1

    # idempotent dispatch absorbs the same tear
    rid = fresh()
    conn = g.db()
    pids = [g.new_packet(conn, rid, kind="outbox",
                         payload={"i": i})[0] for i in range(6)]
    conn.close()

    def dispatcher2():
        c = g.db()
        for p in pids:
            c.execute("INSERT OR IGNORE INTO effects(effect_key, packet_id,"
                      " step, worker_id) VALUES (?,?,?,?)",
                      (f"disp:{p}", str(p), 1, "d"))
            c.commit()
            time.sleep(0.2)
            c.execute("UPDATE packets SET status='DISPATCHED'"
                      " WHERE packet_id=?", (str(p),))
            c.commit()
        c.close()

    p = mp.get_context("fork").Process(target=dispatcher2, daemon=True)
    p.start()
    while True:
        c = g.db()
        got = c.execute("SELECT COUNT(*) FROM effects WHERE step=1"
                        ).fetchone()[0]
        c.close()
        if got >= 3:
            break
        time.sleep(0.05)
    time.sleep(0.1)
    os.kill(p.pid, signal.SIGKILL)
    p.join(timeout=10)
    try:
        os.waitpid(p.pid, 0)
    except ChildProcessError:
        pass
    c = g.db()
    pending = [r[0] for r in c.execute(
        "SELECT packet_id FROM packets WHERE run_id=? AND kind='outbox'"
        " AND status != 'DISPATCHED'", (str(rid),)).fetchall()]
    c.close()
    for pp in pending:
        c = g.db()
        c.execute("INSERT OR IGNORE INTO effects(effect_key, packet_id, step,"
                  " worker_id) VALUES (?,?,?,?)",
                  (f"disp:{pp}", str(pp), 1, "redeliv"))
        c.execute("UPDATE packets SET status='DISPATCHED' WHERE packet_id=?",
                  (str(pp),))
        c.commit()
        c.close()
    bad = 0
    for pp in pids:
        c = g.db()
        cnt = c.execute("SELECT COUNT(*) FROM effects WHERE packet_id=?",
                        (str(pp),)).fetchone()[0]
        c.close()
        bad += cnt != 1
    print("ABSORBED (every row dispatched exactly once)" if bad == 0
          else f"act6 UNEXPECTED ({bad} bad rows)")
    ok &= bad == 0
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
