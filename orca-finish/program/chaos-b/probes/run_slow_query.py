#!/usr/bin/env python3
"""CHAOS-B Q3: slow-query torn windows. Scratch only.

Injects 2-5s latency into commit/checkpoint writes (not failure, just slow)
and asks: does the slow path create NEW torn-state windows?

q3a: slow commit (4s) + supervisor timeout (2s) fires mid-commit.
     Naive: plain effect INSERT -> supervisor double-recovery duplicates.
     Fixed: idempotent effect (INSERT OR IGNORE on deterministic key).
q3b: SIGKILL (real, os.kill) mid-slow-commit in a child process.
     single-txn: claim+effect one txn -> atomic rollback, no torn window.
     split-txn: claim commits, effect txn killed -> orphan (CLAIMED, no
       effect). With reaper -> healed; without -> LOST-STATE.
q3c: SIGKILL mid-slow-checkpoint (outbox dispatch loop: dispatch, 0.4s gap,
     mark). Kill after the 5th dispatch -> row 5 dispatched-but-unmarked.
     Redelivery re-dispatches it. Naive -> DUPLICATED; idempotent dispatch
     (INSERT OR IGNORE) -> SURVIVED.

Usage: python3 probes/run_slow_query.py
"""
import os
import sys
import time
import signal
import threading
import multiprocessing as mp

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "harness"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaos_lib as g
import record as R

RUN_REPS = 3
SLOW_COMMIT_S = 4.0
SUPERVISOR_TIMEOUT_S = 2.0
AFFECTS = ["impl-lane"]


def emit(caller, classification, confidence, detail, notes, claim,
         component="slow commit/checkpoint injection", missions=1):
    R.record(domain="chaos.slow-query", component=component, claim=claim,
             evidence="TEST", caller=caller,
             callee="chaos_lib sqlite txn / os.kill",
             writer="worker thread / forked child", reader="supervisor join",
             classification=classification, confidence=confidence,
             broken_boundary=("exactly-once effect" if classification in
                               ("DUPLICATED", "LOST-STATE") else "none"),
             dependencies=["txn atomicity", "supervisor timeout",
                           "idempotent effect keys"],
             affects_agents=AFFECTS, missions=missions, detail=detail,
             verdict_notes=notes)


def fresh_db():
    for suf in ("", "-wal", "-shm"):
        p = g.DB_PATH + suf
        if os.path.exists(p):
            os.remove(p)
    g.init_db()


def new_run(prompt_ref):
    conn = g.db()
    rid = g.new_run(conn, prompt_ref=prompt_ref)
    conn.close()
    return rid


def count_effect_rows(pid):
    conn = g.db()
    cur = conn.execute("SELECT COUNT(*) FROM effects WHERE packet_id=?",
                       (str(pid),))
    n = cur.fetchone()[0]
    conn.close()
    return n


# ---------------- q3a: slow commit vs supervisor timeout ----------------

def q3a_worker(run_id, pid, variant, done_evt):
    conn = g.db()
    g.claim_packet(conn, pid, "worker", 1)  # t=0, commits; updated_at = claim
    conn.execute("BEGIN")
    if variant == "naive":
        import uuid as _u
        key = f"effect-plain:{pid}:1:{_u.uuid4().hex[:8]}"
        conn.execute(
            "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
            " VALUES (?,?,?,?)", (key, str(pid), 1, "worker"))
    else:
        key = f"effect:{pid}:1"
        conn.execute(
            "INSERT OR IGNORE INTO effects(effect_key, packet_id, step,"
            " worker_id) VALUES (?,?,?,?)", (key, str(pid), 1, "worker"))
    time.sleep(SLOW_COMMIT_S)  # the slow commit window
    conn.commit()
    conn.close()
    done_evt.set()


def q3a_supervisor(run_id, pid, variant):
    """Declares the worker dead after SUPERVISOR_TIMEOUT_S of claim staleness
    and runs recovery: force-release, re-claim, re-apply effect."""
    time.sleep(SUPERVISOR_TIMEOUT_S)
    conn = g.db()
    cur = conn.execute(
        "SELECT status, claimed_by FROM packets WHERE packet_id=?",
        (str(pid),))
    status, claimed_by = cur.fetchone()
    recovered = False
    if status == "CLAIMED" and claimed_by == "worker":
        # force-release the "dead" worker and re-run the unit
        conn.execute("UPDATE packets SET status='ENQUEUED', claimed_by=NULL"
                     " WHERE packet_id=?", (str(pid),))
        conn.commit()
        g.claim_packet(conn, pid, "supervisor", 1)
        if variant == "naive":
            import uuid as _u
            key = f"effect-plain:{pid}:1:{_u.uuid4().hex[:8]}"
            conn.execute(
                "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                " VALUES (?,?,?,?)", (key, str(pid), 1, "supervisor"))
        else:
            conn.execute(
                "INSERT OR IGNORE INTO effects(effect_key, packet_id, step,"
                " worker_id) VALUES (?,?,?,?)",
                (f"effect:{pid}:1", str(pid), 1, "supervisor"))
        conn.commit()
        recovered = True
    conn.close()
    return recovered


def run_q3a(variant):
    for rep in range(RUN_REPS):
        fresh_db()
        run_id = new_run(f"q3a-{variant}")
        conn = g.db()
        pid, _ = g.new_packet(conn, run_id, payload={"q": "3a"})
        conn.close()
        done_evt = threading.Event()
        wt = threading.Thread(target=q3a_worker,
                              args=(run_id, pid, variant, done_evt),
                              daemon=True)
        wt.start()
        recovered = q3a_supervisor(run_id, pid, variant)
        wt.join(timeout=15)
        n = count_effect_rows(pid)
        if variant == "naive":
            cls = "DUPLICATED" if n == 2 else ("SURVIVED" if n == 1
                                               else "LOST-STATE")
            notes = (f"naive double-recovery: supervisor timeout fired at "
                     f"{SUPERVISOR_TIMEOUT_S}s mid {SLOW_COMMIT_S}s commit; "
                     f"effect rows={n}")
        else:
            cls = "SURVIVED" if n == 1 else "DUPLICATED"
            notes = (f"idempotent effect absorbed the double-recovery; "
                     f"effect rows={n}")
        emit(f"run_slow_query.q3a-{variant}", cls, 0.9,
             {"rep": rep, "variant": variant, "effect_rows": n,
              "supervisor_recovered": recovered,
              "supervisor_timeout_s": SUPERVISOR_TIMEOUT_S,
              "slow_commit_s": SLOW_COMMIT_S,
              "completed": 1 if n >= 1 else 0},
             notes,
             claim=("Q3a: supervisor timeout (2s) fires mid slow-commit (4s); "
                    "naive effect duplicates via double-recovery, idempotent "
                    "effect absorbs it."),
             missions=1)


# ---------------- q3b: SIGKILL mid-slow-commit ----------------

def q3b_child(run_id, pid, shape):
    # fresh connection inside the forked child; never share the parent's
    conn = g.db()
    if shape == "single":
        conn.execute("BEGIN")
        conn.execute("UPDATE packets SET status='CLAIMED', claimed_by='w'"
                     " WHERE packet_id=?", (str(pid),))
        conn.execute(
            "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
            " VALUES (?,?,?,?)", (f"effect:{pid}:1", str(pid), 1, "w"))
        time.sleep(5.0)
        conn.commit()
    else:  # split: claim commits fast, effect txn is the slow one
        g.claim_packet(conn, pid, "w", 1)
        conn.execute("BEGIN")
        conn.execute(
            "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
            " VALUES (?,?,?,?)", (f"effect:{pid}:1", str(pid), 1, "w"))
        time.sleep(5.0)
        conn.commit()
    conn.close()


def run_q3b(shape, reaper):
    for rep in range(RUN_REPS):
        fresh_db()
        run_id = new_run(f"q3b-{shape}-reaper{reaper}")
        conn = g.db()
        pid, _ = g.new_packet(conn, run_id, payload={"q": "3b"})
        conn.close()
        proc = mp.get_context("fork").Process(
            target=q3b_child, args=(run_id, pid, shape), daemon=True)
        proc.start()
        time.sleep(2.0)  # kill mid-slow-commit
        os.kill(proc.pid, signal.SIGKILL)
        proc.join(timeout=10)
        try:
            os.waitpid(proc.pid, 0)
        except ChildProcessError:
            pass
        # observe the post-kill state
        conn = g.db()
        cur = conn.execute("SELECT status FROM packets WHERE packet_id=?",
                           (str(pid),))
        post_status = cur.fetchone()[0]
        conn.close()
        n_before = count_effect_rows(pid)
        orphan = (post_status == "CLAIMED" and n_before == 0)
        healed = False
        if reaper and orphan:
            # reaper: pick up CLAIMED-without-effect orphans and finish them
            conn = g.db()
            conn.execute(
                "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                " VALUES (?,?,?,?)", (f"effect:{pid}:1", str(pid), 1,
                                      "reaper"))
            conn.execute("UPDATE packets SET status='COMPLETED'"
                         " WHERE packet_id=?", (str(pid),))
            conn.commit()
            conn.close()
            healed = True
        n = count_effect_rows(pid)
        if shape == "single":
            cls = "SURVIVED" if (post_status == "ENQUEUED" and n == 0) \
                else "LOST-STATE"
            notes = (f"SIGKILL mid-slow-commit, single txn: atomic rollback "
                     f"held; packet={post_status}, effects={n}")
        elif reaper:
            cls = "SURVIVED" if (orphan and healed and n == 1) else "WEDGED"
            notes = (f"split txn kill left orphan (CLAIMED, 0 effects); "
                     f"reaper finished it; effects={n}")
        else:
            cls = "LOST-STATE" if (orphan and n == 0) else "SURVIVED"
            notes = (f"split txn kill left orphan (CLAIMED, 0 effects) and "
                     f"no reaper exists; work lost; effects={n}")
        emit(f"run_slow_query.q3b-{shape}-reaper{reaper}", cls, 0.9,
             {"rep": rep, "shape": shape, "reaper": reaper,
              "orphan_observed": orphan, "post_kill_status": post_status,
              "effect_rows": n,
              "completed": 1 if n == 1 and post_status != "CLAIMED" else 0},
             notes,
             claim=("Q3b: real SIGKILL mid slow-commit; single txn rolls back "
                    "atomically, split txn orphans the claim until a reaper "
                    "finishes it."),
             missions=1)


# ---------------- q3c: SIGKILL mid-slow-checkpoint (outbox) ----------------

def q3c_child(run_id, pids, variant):
    conn = g.db()
    for pid in pids:
        # (1) dispatch: the external effect, committed on its own
        if variant == "naive":
            import uuid as _u
            key = f"dispatch:{pid}:{_u.uuid4().hex[:8]}"
            conn.execute(
                "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
                " VALUES (?,?,?,?)", (key, str(pid), 1, "dispatcher"))
        else:
            conn.execute(
                "INSERT OR IGNORE INTO effects(effect_key, packet_id, step,"
                " worker_id) VALUES (?,?,?,?)",
                (f"dispatch:{pid}", str(pid), 1, "dispatcher"))
        conn.commit()
        time.sleep(0.4)  # the slow checkpoint gap
        # (2) mark dispatched
        conn.execute("UPDATE packets SET status='DISPATCHED' WHERE packet_id=?",
                     (str(pid),))
        conn.commit()
    conn.close()


def q3c_dispatch_count(pid):
    conn = g.db()
    cur = conn.execute(
        "SELECT COUNT(*) FROM effects WHERE packet_id=? AND step=1",
        (str(pid),))
    n = cur.fetchone()[0]
    conn.close()
    return n


def run_q3c(variant):
    for rep in range(RUN_REPS):
        fresh_db()
        run_id = new_run(f"q3c-{variant}")
        conn = g.db()
        pids = []
        for i in range(10):
            pid, _ = g.new_packet(conn, run_id, kind="outbox",
                                  payload={"q": "3c", "i": i})
            pids.append(pid)
        conn.close()
        proc = mp.get_context("fork").Process(
            target=q3c_child, args=(run_id, pids, variant), daemon=True)
        proc.start()
        # kill after exactly the 5th dispatch lands: deterministic torn set
        while True:
            if q3c_dispatch_count(pids[4]) >= 1:
                break
            time.sleep(0.05)
        time.sleep(0.1)  # inside the 0.4s checkpoint gap of row 5
        os.kill(proc.pid, signal.SIGKILL)
        proc.join(timeout=10)
        try:
            os.waitpid(proc.pid, 0)
        except ChildProcessError:
            pass
        # recovery: redeliver every row not marked DISPATCHED
        conn = g.db()
        cur = conn.execute(
            "SELECT packet_id FROM packets WHERE run_id=? AND kind='outbox'"
            " AND status != 'DISPATCHED'", (str(run_id),))
        pending = [r[0] for r in cur.fetchall()]
        conn.close()
        for pid in pending:
            conn = g.db()
            if variant == "naive":
                import uuid as _u
                key = f"dispatch:{pid}:{_u.uuid4().hex[:8]}"
                conn.execute(
                    "INSERT INTO effects(effect_key, packet_id, step,"
                    " worker_id) VALUES (?,?,?,?)",
                    (key, str(pid), 1, "redelivery"))
            else:
                conn.execute(
                    "INSERT OR IGNORE INTO effects(effect_key, packet_id,"
                    " step, worker_id) VALUES (?,?,?,?)",
                    (f"dispatch:{pid}", str(pid), 1, "redelivery"))
            conn.execute("UPDATE packets SET status='DISPATCHED'"
                         " WHERE packet_id=?", (str(pid),))
            conn.commit()
            conn.close()
        counts = [q3c_dispatch_count(p) for p in pids]
        dupes = sum(1 for c in counts if c > 1)
        undelivered = sum(1 for c in counts if c == 0)
        if variant == "naive":
            cls = "DUPLICATED" if dupes > 0 else "SURVIVED"
            notes = (f"SIGKILL mid-checkpoint: row dispatched but unmarked; "
                     f"redelivery re-dispatched {dupes} row(s); "
                     f"undelivered={undelivered}")
        else:
            cls = "SURVIVED" if (dupes == 0 and undelivered == 0) \
                else "DUPLICATED"
            notes = (f"idempotent dispatch absorbed the torn checkpoint; "
                     f"dupes={dupes}, undelivered={undelivered}")
        emit(f"run_slow_query.q3c-{variant}", cls, 0.9,
             {"rep": rep, "variant": variant, "per_row_dispatches": counts,
              "duplicated_rows": dupes, "undelivered_rows": undelivered,
              "completed": 10 - undelivered},
             notes,
             claim=("Q3c: SIGKILL mid slow-checkpoint (outbox dispatch gap); "
                    "dispatched-but-unmarked row is re-dispatched on "
                    "recovery unless dispatch is idempotent."),
             missions=10)


if __name__ == "__main__":
    run_q3a("naive")
    run_q3a("fixed")
    run_q3b("single", reaper=True)
    run_q3b("split", reaper=True)
    run_q3b("split", reaper=False)
    run_q3c("naive")
    run_q3c("fixed")
    print("Q3 done", flush=True)
