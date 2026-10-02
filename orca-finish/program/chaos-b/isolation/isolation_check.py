#!/usr/bin/env python3
"""CHAOS-A isolation proof. MUST pass before any chaos probe runs.

Checks:
 1. DB path lives inside the chaos-b lane dir.
 2. Banned-token scan of all harness source (production identifiers).
 3. Socket-blocked smoke run: socket.socket is monkeypatched to raise, then a
    full mini-pass (run -> packet -> claim -> effects -> checkpoint ->
    completion -> recovery classification) executes. Zero network required.
 4. File-touch audit: every file modified during the smoke run (mtime window)
    under $HOME must sit inside the chaos-b dir (plus the DB's -wal/-shm).

Exit 0 + ISOLATION_PROVEN on success, nonzero otherwise.
"""
import os
import re
import socket
import sys
import time

CHAOS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS = os.path.join(CHAOS_DIR, "harness")
HOME = os.path.expanduser("~")

BANNED = [
    "ping_runtime", "5432", "8080", "54339", "/home/nolan",
    "brain-postgres", "100.79.", "tailscale", "oracle", "gateway",
    "psycopg", "requests", "urllib", "http.client", "websocket",
]

sys.path.insert(0, HARNESS)


def check_db_path():
    import chaos_lib as g
    p = os.path.abspath(g.DB_PATH)
    assert p.startswith(os.path.abspath(CHAOS_DIR) + os.sep), f"DB outside lane: {p}"
    assert os.path.abspath(g.LOCK_PATH).startswith(os.path.abspath(CHAOS_DIR) + os.sep)
    return p


def check_banned_tokens():
    hits = []
    for fn in sorted(os.listdir(HARNESS)):
        if not fn.endswith((".py", ".sql")):
            continue
        text = open(os.path.join(HARNESS, fn)).read()
        for tok in BANNED:
            for m in re.finditer(re.escape(tok), text):
                # allow the token inside this isolation file's own list and comments
                line = text[max(0, m.start()-80):m.end()+40]
                hits.append((fn, tok, line.strip()[:100]))
    # filter: the BANNED list literal in THIS file is expected
    hits = [h for h in hits if not (h[0] == "isolation_check.py")]
    return hits


class _BlockedSocket:
    def __init__(self, *a, **k):
        raise RuntimeError("ISOLATION: socket creation blocked during smoke")


def check_socket_blocked_smoke():
    real_socket = socket.socket
    socket.socket = _BlockedSocket
    socket.create_connection = lambda *a, **k: (_ for _ in ()).throw(
        RuntimeError("ISOLATION: create_connection blocked"))
    try:
        import chaos_lib as g
        if os.path.exists(g.DB_PATH):
            os.remove(g.DB_PATH)
        for suf in ("-wal", "-shm"):
            if os.path.exists(g.DB_PATH + suf):
                os.remove(g.DB_PATH + suf)
        g.init_db()
        conn = g.db()
        rid = g.new_run(conn, prompt_ref="isolation-smoke")
        lid = "lease-smoke"
        tok = g.lease_issue(conn, lid, "worker-smoke", 60)
        assert g.lease_valid(conn, lid, tok)
        pid, is_new = g.new_packet(conn, rid, payload={"smoke": True})
        assert is_new
        assert g.claim_packet(conn, pid, "worker-smoke", 1)
        g.set_packet(conn, pid, "IN_FLIGHT")
        for i in (1, 2, 3):
            assert g.apply_effect(conn, pid, i, "worker-smoke") is True
            assert g.apply_effect(conn, pid, i, "worker-smoke") is False  # idempotent
            g.checkpoint(conn, rid, {"step": i})
        assert g.emit_completion(conn, rid, pid, "sha256:smoke") is True
        assert g.emit_completion(conn, rid, pid, "sha256:smoke") is False  # exact-once
        g.set_packet(conn, pid, "SUCCEEDED")
        g.set_run_status(conn, rid, "COMPLETED")
        cp = g.latest_checkpoint(conn, rid)
        assert g.restore_checkpoint(conn, rid, cp["checkpoint_id"])["step"] == 3
        # stale restore refusal
        g.checkpoint(conn, rid, {"step": 4})
        try:
            g.restore_checkpoint(conn, rid, cp["checkpoint_id"])
            raise AssertionError("stale restore was NOT refused")
        except g.StaleCheckpointError:
            pass
        # epoch fencing
        lock = g.CoordLock()
        assert lock.acquire()
        e1 = g.coord_epoch_bump(conn)
        g.set_packet_epoch(conn, pid, e1)
        e2 = g.coord_epoch_bump(conn)
        g.set_packet_epoch(conn, pid, e2)  # new coordinator re-stamps
        assert g.fenced_packet_write(conn, pid, e1, "FAILED") == 0  # zombie rejected
        assert g.fenced_packet_write(conn, pid, e2, "SUCCEEDED") == 1
        lock.release()
        n, _ = g.count_effects(conn, pid)
        assert n == 3, f"expected 3 effects, got {n}"
        conn.close()
        # CHAOS-B additions: bounded pool + skew-aware lease ops, sockets still
        # blocked. Pool acquire/release with max_size=1.
        pool = g.BoundedPool(max_size=1)
        with pool.acquire(timeout=5) as pc:
            pc.conn.execute("SELECT 1")
        assert pool.acquires == 1 and pool.timeouts == 0
        # server-clock lease extend: fresh lease extends, expired one refuses.
        c2 = g.db()
        lid2 = "lease-b-smoke"
        tok2 = g.lease_issue(c2, lid2, "w2", 60)
        assert g.lease_extend_server(c2, lid2, "w2", tok2, 60) is True
        g.lease_simulate_expiry(c2, lid2, seconds_ago=5)
        assert g.lease_extend_server(c2, lid2, "w2", tok2, 60) is False
        g.lease_revoke(c2, lid2)
        assert g.lease_valid(c2, lid2, tok2) is False
        c2.close()
        return True
    finally:
        socket.socket = real_socket


def check_file_touches():
    """Precise attribution: run the smoke in a child under strace and list
    every path opened for write. All must sit inside the chaos-b lane dir."""
    import subprocess
    smoke = (
        "import sys, os; sys.path.insert(0, %r); "
        "import chaos_lib as g; "
        "g.init_db(); c = g.db(); rid = g.new_run(c); "
        "pid, _ = g.new_packet(c, rid); g.claim_packet(c, pid, 'w', 1); "
        "g.apply_effect(c, pid, 1, 'w'); g.checkpoint(c, rid, {'step': 1}); "
        "l = g.CoordLock(); l.acquire(); l.release(); c.close()"
        % HARNESS
    )
    r = subprocess.run(
        ["strace", "-f", "-e", "trace=openat", "-o", "/tmp/chaos-b-strace.log",
         sys.executable, "-c", smoke],
        capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, f"smoke child failed: {r.stderr[-500:]}"
    lane = os.path.abspath(CHAOS_DIR) + os.sep
    bad = set()
    with open("/tmp/chaos-b-strace.log") as f:
        for line in f:
            m = re.search(r'openat\([^,]+,\s*"([^"]+)"\s*,\s*O_([A-Z_|]+)', line)
            if not m:
                continue
            path, flags = m.group(1), m.group(2)
            if not any(w in flags for w in ("WRONLY", "RDWR", "CREAT", "APPEND")):
                continue
            if "O_PATH" in flags or "O_DIRECTORY" in flags:
                continue
            ap = os.path.abspath(path)
            if not ap.startswith(lane):
                bad.add(ap)
    try:
        os.remove("/tmp/chaos-b-strace.log")
    except OSError:
        pass
    return sorted(bad)


def main():
    print("ISOLATION CHECK 1: db path...", flush=True)
    dbp = check_db_path()
    print(f"  ok: {dbp}", flush=True)
    print("ISOLATION CHECK 2: banned tokens...", flush=True)
    hits = check_banned_tokens()
    if hits:
        for h in hits:
            print(f"  BANNED TOKEN: {h}", flush=True)
        print("ISOLATION_FAILED banned tokens present", flush=True)
        return 2
    print("  ok: zero banned tokens", flush=True)
    print("ISOLATION CHECK 3: socket-blocked smoke...", flush=True)
    check_socket_blocked_smoke()
    print("  ok: full mini-pass completed with sockets blocked", flush=True)
    print("ISOLATION CHECK 4: strace file-touch audit...", flush=True)
    bad = check_file_touches()
    if bad:
        for b in bad:
            print(f"  OUT-OF-LANE WRITE: {b}", flush=True)
        print("ISOLATION_FAILED out-of-lane writes", flush=True)
        return 3
    print("  ok: every written path inside chaos-b dir", flush=True)
    print("ISOLATION_PROVEN", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
