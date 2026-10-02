"""CHAOS-A harness library: durable-execution boundary semantics under test.

File-backed SQLite only (harness/chaos.db). Never production. Re-implements the
wave-1 mechanism-map boundary semantics (records 1,6,7,8,10,13,14,15,17) as the
behavioral spec for the witnessed-A6-re-proof pattern, since the A5 worktree
sources are absent on this host (see CHECKPOINT.md).
"""
import fcntl
import hashlib
import json
import os
import secrets
import sqlite3
import time
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "chaos.db")
LOCK_PATH = os.path.join(HERE, "coord.lock")
SCHEMA_PATH = os.path.join(HERE, "schema.sql")

# Legal run-status transitions (record 1: status changes only through a
# transition table).
RUN_TRANSITIONS = {
    "RUNNING": {"COMPLETED", "FAILED", "OUTCOME_UNKNOWN"},
    "OUTCOME_UNKNOWN": {"COMPLETED", "FAILED"},
    "FAILED": set(),
    "COMPLETED": set(),
}


class StaleCheckpointError(Exception):
    pass


class ConnectionGone(Exception):
    """Raised by the flaky pool while the DB is (simulated) disappeared."""


def _canon(o):
    return json.dumps(o, sort_keys=True, separators=(",", ":"))


def _sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def init_db(path=DB_PATH):
    fresh = not os.path.exists(path)
    conn = sqlite3.connect(path, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    if fresh:
        with open(SCHEMA_PATH) as f:
            conn.executescript(f.read())
        conn.commit()
    return conn


def db(path=DB_PATH):
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=30000;")
    return conn


# ---- audit (record 17: immutable append-only) ----
def audit(conn, run_id, kind, detail):
    conn.execute(
        "INSERT INTO audit_events(run_id, kind, detail) VALUES (?,?,?)",
        (str(run_id), kind, _canon(detail)))
    conn.commit()


def count_audit(conn, run_id, kind):
    cur = conn.execute(
        "SELECT COUNT(*) FROM audit_events WHERE run_id=? AND kind=?",
        (str(run_id), kind))
    return cur.fetchone()[0]


# ---- runs (record 1) ----
def new_run(conn, prompt_ref="chaos-a", tenant="chaos-a"):
    rid = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO runs(run_id, tenant_id, status, prompt_ref)
           VALUES (?,?, 'RUNNING', ?)""", (rid, tenant, prompt_ref))
    conn.commit()
    audit(conn, rid, "run.created", {"prompt_ref": prompt_ref})
    return rid


def set_run_status(conn, run_id, status):
    cur = conn.execute("SELECT status FROM runs WHERE run_id=?", (str(run_id),))
    row = cur.fetchone()
    if not row:
        raise KeyError(f"run {run_id} missing")
    old = row[0]
    if status != old and status not in RUN_TRANSITIONS.get(old, set()):
        raise ValueError(f"illegal run transition {old} -> {status}")
    conn.execute(
        """UPDATE runs SET status=?,
              completed_at=CASE WHEN ? IN ('COMPLETED','FAILED','OUTCOME_UNKNOWN')
                                THEN strftime('%Y-%m-%dT%H:%M:%fZ','now')
                                ELSE completed_at END
           WHERE run_id=?""", (status, status, str(run_id)))
    conn.commit()
    audit(conn, run_id, "run.status", {"from": old, "to": status})


def get_run(conn, run_id):
    cur = conn.execute(
        "SELECT status, lease_holder, fencing_token FROM runs WHERE run_id=?",
        (str(run_id),))
    r = cur.fetchone()
    return dict(r) if r else None


# ---- packets (records 6, 14) ----
def new_packet(conn, run_id, kind="t", effect_class="TRANSACTIONAL",
               criteria="must complete honestly", payload=None, idem=None):
    """Insert-or-dedup on the idempotency key. Returns (packet_id, is_new)."""
    pid = str(uuid.uuid4())
    idem = idem or f"idem-{uuid.uuid4().hex[:12]}"
    try:
        conn.execute(
            """INSERT INTO packets(packet_id, run_id, kind, status,
                  acceptance_criteria, effect_class, idempotency_key, payload)
               VALUES (?,?,?,'ENQUEUED',?,?,?,?)""",
            (pid, str(run_id), kind, criteria, effect_class, idem,
             _canon(payload or {})))
        conn.commit()
        audit(conn, run_id, "packet.enqueued",
              {"packet_id": pid, "kind": kind, "idem": idem})
        return pid, True
    except sqlite3.IntegrityError:
        conn.rollback()
        cur = conn.execute(
            "SELECT packet_id FROM packets WHERE idempotency_key=?", (idem,))
        existing = cur.fetchone()[0]
        audit(conn, run_id, "packet.dedup_hit",
              {"idem": idem, "existing_packet": existing,
               "rejected_payload": _canon(payload or {})[:200]})
        return existing, False


def claim_packet(conn, packet_id, worker_id, fencing):
    """Atomic claim: exactly one winner. Records the delegation."""
    cur = conn.execute(
        """UPDATE packets
              SET status='CLAIMED', claimed_by=?, claim_fencing=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE packet_id=? AND status='ENQUEUED'""",
        (worker_id, fencing, str(packet_id)))
    won = cur.rowcount == 1
    if won:
        conn.execute(
            "INSERT INTO delegations(packet_id, worker_id, fencing) VALUES (?,?,?)",
            (str(packet_id), worker_id, fencing))
    conn.commit()
    return won


def reclaim_packet(conn, packet_id, old_worker, new_worker, new_fencing):
    """Take over a CLAIMED/IN_FLIGHT packet whose holder the CALLER verified dead."""
    cur = conn.execute(
        """UPDATE packets
              SET claimed_by=?, claim_fencing=?, attempt_seq=attempt_seq+1,
                  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE packet_id=? AND claimed_by=? AND status IN ('CLAIMED','IN_FLIGHT')""",
        (new_worker, new_fencing, str(packet_id), old_worker))
    won = cur.rowcount == 1
    if won:
        conn.execute(
            "INSERT INTO delegations(packet_id, worker_id, fencing) VALUES (?,?,?)",
            (str(packet_id), new_worker, new_fencing))
    conn.commit()
    return won


def set_packet(conn, packet_id, status, result_ref=None):
    conn.execute(
        """UPDATE packets SET status=?, result_ref=COALESCE(?,result_ref),
                  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE packet_id=?""", (status, result_ref, str(packet_id)))
    conn.commit()


def get_packet(conn, packet_id):
    cur = conn.execute(
        """SELECT packet_id, status, claimed_by, claim_fencing, attempt_seq,
                  coordinator_epoch, result_ref, idempotency_key
           FROM packets WHERE packet_id=?""", (str(packet_id),))
    r = cur.fetchone()
    return dict(r) if r else None


def count_delegations(conn, packet_id):
    cur = conn.execute(
        "SELECT COUNT(*), COUNT(DISTINCT worker_id) FROM delegations WHERE packet_id=?",
        (str(packet_id),))
    n, workers = cur.fetchone()
    return n, workers


# ---- checkpoints (record 7) ----
def checkpoint(conn, run_id, state):
    digest = _sha(_canon(state))
    cur = conn.execute(
        """INSERT INTO checkpoints(run_id, checkpoint_id, state, state_digest)
           SELECT ?, COALESCE(MAX(checkpoint_id),0)+1, ?, ?
             FROM checkpoints WHERE run_id=?""",
        (str(run_id), _canon(state), digest, str(run_id)))
    conn.commit()
    cid = cur.lastrowid and conn.execute(
        "SELECT MAX(checkpoint_id) FROM checkpoints WHERE run_id=?",
        (str(run_id),)).fetchone()[0]
    audit(conn, run_id, "checkpoint.saved",
          {"checkpoint_id": cid, "digest": digest[:12]})
    return cid


def latest_checkpoint(conn, run_id):
    cur = conn.execute(
        """SELECT checkpoint_id, state, state_digest FROM checkpoints
           WHERE run_id=? ORDER BY checkpoint_id DESC LIMIT 1""", (str(run_id),))
    r = cur.fetchone()
    return {"checkpoint_id": r[0], "state": json.loads(r[1]),
            "digest": r[2]} if r else None


def restore_checkpoint(conn, run_id, checkpoint_id):
    cur = conn.execute(
        "SELECT MAX(checkpoint_id) FROM checkpoints WHERE run_id=?", (str(run_id),))
    mx = cur.fetchone()[0] or 0
    if checkpoint_id < mx:
        audit(conn, run_id, "checkpoint.stale_refused",
              {"requested": checkpoint_id, "latest": mx})
        raise StaleCheckpointError(
            f"requested checkpoint {checkpoint_id} but latest is {mx}")
    cur = conn.execute(
        """SELECT state, state_digest FROM checkpoints
           WHERE run_id=? AND checkpoint_id=?""", (str(run_id), checkpoint_id))
    r = cur.fetchone()
    if not r:
        raise StaleCheckpointError(f"checkpoint {checkpoint_id} does not exist")
    state, digest = r
    if _sha(_canon(json.loads(state))) != digest:
        audit(conn, run_id, "checkpoint.digest_mismatch",
              {"checkpoint_id": checkpoint_id})
        raise StaleCheckpointError("checkpoint digest mismatch: refusing")
    audit(conn, run_id, "checkpoint.restored", {"checkpoint_id": checkpoint_id})
    return json.loads(state)


# ---- leases (records 10, 13) ----
def lease_issue(conn, lease_id, holder, ttl_s, scope="chaos-a/scratch",
                role="executor", tools=None):
    token = secrets.token_hex(32)
    import datetime
    exp = (datetime.datetime.now(datetime.timezone.utc) +
           datetime.timedelta(seconds=ttl_s)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    conn.execute(
        """INSERT INTO leases(lease_id, holder_id, scope, role,
              allowed_tools, token_hash, expires_at)
           VALUES (?,?,?,?,?,?,?)""",
        (lease_id, holder, scope, role, _canon(tools or ["*"]),
         _sha(token), exp))
    conn.commit()
    return token


def lease_valid(conn, lease_id, token):
    cur = conn.execute(
        "SELECT token_hash, expires_at, revoked FROM leases WHERE lease_id=?",
        (lease_id,))
    r = cur.fetchone()
    if not r:
        return False
    th, exp, revoked = r["token_hash"], r["expires_at"], r["revoked"]
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    return (not revoked) and (th == _sha(token)) and (exp > now)


def lease_revoke(conn, lease_id):
    conn.execute("UPDATE leases SET revoked=1 WHERE lease_id=?", (lease_id,))
    conn.commit()


# ---- effects (record 8: idempotent side-effect application) ----
def apply_effect(conn, packet_id, step, worker_id):
    """INSERT OR IGNORE on the deterministic effect key. Returns True iff
    this call actually applied the effect (first time)."""
    key = f"effect:{packet_id}:{step}"
    cur = conn.execute(
        "INSERT OR IGNORE INTO effects(effect_key, packet_id, step, worker_id)"
        " VALUES (?,?,?,?)", (key, str(packet_id), step, worker_id))
    conn.commit()
    return cur.rowcount == 1


def count_effects(conn, packet_id):
    cur = conn.execute(
        "SELECT COUNT(*), COUNT(DISTINCT step) FROM effects WHERE packet_id=?",
        (str(packet_id),))
    return cur.fetchone()


def apply_effect_plain(conn, packet_id, step, worker_id):
    """COUNTERFACTUAL: non-idempotent effect application. Every call inserts a
    NEW row (models side effects like sending an email twice). Used only to
    prove the failure class that idempotent keys prevent. Always returns True."""
    import uuid as _uuid
    key = f"effect-plain:{packet_id}:{step}:{_uuid.uuid4().hex[:8]}"
    conn.execute(
        "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
        " VALUES (?,?,?,?)", (key, str(packet_id), step, worker_id))
    conn.commit()
    return True


# ---- tool calls (record 8: side-effect boundary) ----
def tool_submit(conn, run_id, packet_id, tool, effect_class, idem):
    cid = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO tool_calls(call_id, run_id, packet_id, tool_name,
              effect_class, idempotency_key, status)
           VALUES (?,?,?,?,?,?,'SUBMITTED')""",
        (cid, str(run_id), str(packet_id) if packet_id else None,
         tool, effect_class, idem))
    conn.commit()
    return cid


def tool_ack(conn, call_id):
    conn.execute(
        "UPDATE tool_calls SET status='ACKED', effect_ack_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
        " WHERE call_id=?", (str(call_id),))
    conn.commit()


def tool_timeout(conn, call_id):
    """Timeout classification. Post-boundary -> OUTCOME_UNKNOWN (never FAILED,
    never blind-retried). Pre-boundary -> FAILED (safe to requeue)."""
    cur = conn.execute(
        "SELECT status, effect_ack_at FROM tool_calls WHERE call_id=?",
        (str(call_id),))
    status, ack_at = cur.fetchone()
    if ack_at is not None:
        outcome = "OUTCOME_UNKNOWN"
        evidence = (f"effect ack observed at {ack_at}; result unconfirmed at "
                    "timeout; must not retry blindly, must not mark success")
    else:
        outcome = "FAILED"
        evidence = (f"timeout before side-effect boundary (last status {status}); "
                    "safe to requeue")
    conn.execute(
        "UPDATE tool_calls SET status='TIMED_OUT', outcome=?, evidence=? WHERE call_id=?",
        (outcome, evidence, str(call_id)))
    conn.commit()
    return outcome


# ---- coordinator epoch + advisory lock (record 14) ----
class CoordLock:
    """POSIX advisory-lock coordinator claim. The holder keeps the fd open for
    the whole reign; SIGKILL drops the fd and frees the lock, exactly the
    PG-advisory-lock semantics of A6 fix 6a342dd27."""

    def __init__(self, path=LOCK_PATH):
        self.path = path
        self.fd = None

    def acquire(self):
        self.fd = os.open(self.path, os.O_CREAT | os.O_RDWR, 0o600)
        try:
            fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except OSError:
            os.close(self.fd)
            self.fd = None
            return False

    def release(self):
        if self.fd is not None:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_UN)
            finally:
                os.close(self.fd)
                self.fd = None

    def __enter__(self):
        if not self.acquire():
            raise RuntimeError("coordinator claim denied")
        return self

    def __exit__(self, *a):
        self.release()


def coord_epoch_bump(conn):
    cur = conn.execute(
        "UPDATE coordinator_epoch SET epoch=epoch+1, heartbeat_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"
        " WHERE id=1 RETURNING epoch")
    row = cur.fetchone()
    conn.commit()
    return row[0]


def coord_epoch(conn):
    cur = conn.execute("SELECT epoch FROM coordinator_epoch WHERE id=1")
    return cur.fetchone()[0]


def fenced_packet_write(conn, packet_id, epoch, status):
    """Epoch-fenced write: a deposed coordinator's late write is rejected."""
    cur = conn.execute(
        """UPDATE packets SET status=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE packet_id=? AND coordinator_epoch=?""",
        (status, str(packet_id), epoch))
    conn.commit()
    return cur.rowcount


def set_packet_epoch(conn, packet_id, epoch):
    conn.execute("UPDATE packets SET coordinator_epoch=? WHERE packet_id=?",
                 (epoch, str(packet_id)))
    conn.commit()


# ---- exactly-once completion (record 9: write-once completions) ----
def emit_completion(conn, run_id, packet_id, result_ref):
    """INSERT OR IGNORE on UNIQUE(packet_id). Returns True iff this call
    emitted the completion (first time). The exactly-once fence."""
    cur = conn.execute(
        "INSERT OR IGNORE INTO completions(packet_id, run_id, result_ref)"
        " VALUES (?,?,?)", (str(packet_id), str(run_id), result_ref))
    conn.commit()
    emitted = cur.rowcount == 1
    if emitted:
        audit(conn, run_id, "completion.emitted",
              {"packet": str(packet_id), "result_ref": result_ref})
    else:
        audit(conn, run_id, "completion.duplicate_suppressed",
              {"packet": str(packet_id)})
    return emitted


def count_completions(conn, packet_id):
    cur = conn.execute("SELECT COUNT(*) FROM completions WHERE packet_id=?",
                       (str(packet_id),))
    return cur.fetchone()[0]


# ---- flaky pool (DB disappearance probes) ----
class FlakyPool:
    """Own tiny connection pool with fault injection for DB-disappearance
    probes. drop_all() closes every connection and poisons the pool: db()
    raises ConnectionGone until heal() is called."""

    def __init__(self, path=DB_PATH):
        self.path = path
        self._conns = []
        self._gone_until_calls = 0
        self._dropped = False

    def db(self):
        if self._gone_until_calls > 0:
            self._gone_until_calls -= 1
            raise ConnectionGone("database disappeared (injected)")
        if self._dropped:
            raise ConnectionGone("database disappeared (injected)")
        c = sqlite3.connect(self.path, timeout=5)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA busy_timeout=5000;")
        self._conns.append(c)
        return c

    def drop_all(self, gone_calls=10**9):
        """Simulate the DB disappearing: close everything, poison the pool.
        Finite gone_calls: that many failed acquisitions, then auto-heal.
        Infinite (default): outage until heal() is called."""
        for c in self._conns:
            try:
                c.close()
            except Exception:
                pass
        self._conns = []
        if gone_calls >= 10**9:
            self._dropped = True
            self._gone_until_calls = 0
        else:
            self._dropped = False
            self._gone_until_calls = gone_calls

    def heal(self):
        self._dropped = False
        self._gone_until_calls = 0

    def tx(self, fn, retries=5, backoff=0.2):
        """Bounded-retry transactional unit. fn(conn) runs inside one
        transaction; transient ConnectionGone/OperationalError retries with
        backoff; exhaustion raises."""
        last = None
        for attempt in range(retries):
            try:
                conn = self.db()
                try:
                    conn.execute("BEGIN IMMEDIATE")
                    out = fn(conn)
                    conn.commit()
                    return out
                finally:
                    conn.close()
            except (ConnectionGone, sqlite3.OperationalError) as e:
                last = e
                time.sleep(backoff * (attempt + 1))
        raise last


# ---- Q2: bounded connection pool (pool-exhaustion probes) ----
import threading


class PoolTimeout(Exception):
    """acquire() deadline exceeded: the bounded-escape signal."""


class _PooledConn:
    def __init__(self, pool, conn):
        self._pool = pool
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()

    def close(self):
        if self.conn is not None:
            try:
                self.conn.rollback()
            except Exception:
                pass
            self._pool._release(self.conn)
            self.conn = None


class BoundedPool:
    """Fixed-size pool. acquire() blocks while all connections are checked
    out; with timeout it raises PoolTimeout instead (the bounded escape).
    Tracks acquisition latency for p99 measurement."""

    def __init__(self, path=DB_PATH, max_size=2):
        self._path = path
        self._max = max_size
        self._free = []
        self._total = 0
        self._cond = threading.Condition()
        self.acquire_latencies = []
        self.timeouts = 0
        self.acquires = 0

    def acquire(self, timeout=None):
        t0 = time.monotonic()
        with self._cond:
            deadline = None if timeout is None else t0 + timeout
            while True:
                if self._free:
                    c = self._free.pop()
                    self._note_acquire(t0)
                    return _PooledConn(self, c)
                if self._total < self._max:
                    # check_same_thread=False: the pool hands a connection to
                    # whichever thread checks it out; exclusive checkout
                    # (one thread at a time) keeps this safe.
                    c = sqlite3.connect(self._path, timeout=30,
                                        check_same_thread=False)
                    c.row_factory = sqlite3.Row
                    c.execute("PRAGMA busy_timeout=30000;")
                    self._total += 1
                    self._note_acquire(t0)
                    return _PooledConn(self, c)
                if deadline is None:
                    self._cond.wait()
                else:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        self.timeouts += 1
                        raise PoolTimeout(
                            f"pool acquire timed out after {timeout}s "
                            f"(max_size={self._max})")
                    self._cond.wait(remaining)

    def _note_acquire(self, t0):
        self.acquire_latencies.append(time.monotonic() - t0)
        self.acquires += 1

    def _release(self, c):
        with self._cond:
            self._free.append(c)
            self._cond.notify()

    def p99_acquire_latency(self):
        import statistics
        lat = sorted(self.acquire_latencies)
        if not lat:
            return 0.0
        idx = min(len(lat) - 1, int(0.99 * len(lat)))
        return lat[idx]


# ---- Q1: clock-skew lease operations (naive vs server-clock variants) ----
def _utcnow_iso():
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%S.%fZ")


def _shift_iso(iso, skew_s):
    import datetime
    dt = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%S.%fZ").replace(
        tzinfo=datetime.timezone.utc)
    return (dt + datetime.timedelta(seconds=skew_s)).strftime(
        "%Y-%m-%dT%H:%M:%S.%fZ")


def lease_simulate_expiry(conn, lease_id, seconds_ago=5):
    """Fault injection: move expires_at into the past (models time passing
    deterministically without real sleeps)."""
    past = _shift_iso(_utcnow_iso(), -seconds_ago)
    conn.execute("UPDATE leases SET expires_at=? WHERE lease_id=?",
                 (past, lease_id))
    conn.commit()


def lease_extend_naive(conn, lease_id, holder, token, worker_now_iso, ttl_s):
    """NAIVE variant: the store trusts the WORKER's clock for the expiry
    check and authenticates by bearer token alone: presenting a valid token
    reassigns the holder, even if the lease was re-granted to someone else.
    Models implementations that accept client heartbeats at face value."""
    new_exp = _shift_iso(worker_now_iso, ttl_s)
    cur = conn.execute(
        """UPDATE leases SET expires_at=?, holder_id=?
           WHERE lease_id=? AND token_hash=? AND revoked=0
             AND expires_at > ?""",
        (new_exp, holder, lease_id, _sha(token), worker_now_iso))
    conn.commit()
    return cur.rowcount == 1


def lease_extend_server(conn, lease_id, holder, token, ttl_s):
    """FIXED variant: expiry judged on the SERVER clock; extend binds
    holder+token; expired or re-granted leases cannot be extended."""
    now = _utcnow_iso()
    new_exp = _shift_iso(now, ttl_s)
    cur = conn.execute(
        """UPDATE leases SET expires_at=?
           WHERE lease_id=? AND holder_id=? AND token_hash=?
             AND revoked=0 AND expires_at > ?""",
        (new_exp, lease_id, holder, _sha(token), now))
    conn.commit()
    return cur.rowcount == 1


def lease_grant_server(conn, lease_id, holder, ttl_s):
    """Server-side grant: succeeds only when the lease is unheld or expired
    on the SERVER clock. Issues a fresh bearer token."""
    import datetime
    now = _utcnow_iso()
    token = secrets.token_hex(32)
    new_exp = _shift_iso(now, ttl_s)
    cur = conn.execute("SELECT holder_id, expires_at, revoked FROM leases "
                       "WHERE lease_id=?", (lease_id,))
    r = cur.fetchone()
    if r is None:
        conn.execute(
            """INSERT INTO leases(lease_id, holder_id, scope, role,
                  allowed_tools, token_hash, expires_at)
               VALUES (?,?,'chaos-b/q1','executor','["*"]',?,?)""",
            (lease_id, holder, _sha(token), new_exp))
        conn.commit()
        return token, True
    if r["revoked"] or r["expires_at"] > now:
        return None, False
    cur = conn.execute(
        """UPDATE leases SET holder_id=?, token_hash=?, expires_at=?
           WHERE lease_id=? AND expires_at <= ? AND revoked=0""",
        (holder, _sha(token), new_exp, lease_id, now))
    conn.commit()
    return (token, True) if cur.rowcount == 1 else (None, False)


def lease_grant_naive(conn, lease_id, holder, ttl_s):
    """NAIVE grant variant: server-clock expiry check, but the bearer token
    is scoped to the LEASE, not the grant: re-grant does NOT rotate it.
    Combined with a worker-clock-trusted extend, a superseded holder's old
    token still authenticates (facet 2 of FC-5)."""
    now = _utcnow_iso()
    new_exp = _shift_iso(now, ttl_s)
    cur = conn.execute("SELECT holder_id, expires_at, revoked FROM leases "
                       "WHERE lease_id=?", (lease_id,))
    r = cur.fetchone()
    if r is None:
        token = secrets.token_hex(32)
        conn.execute(
            """INSERT INTO leases(lease_id, holder_id, scope, role,
                  allowed_tools, token_hash, expires_at)
               VALUES (?,?,'chaos-b/q1','executor','["*"]',?,?)""",
            (lease_id, holder, _sha(token), new_exp))
        conn.commit()
        return token, True
    if r["revoked"] or r["expires_at"] > now:
        return None, False
    cur = conn.execute(
        """UPDATE leases SET holder_id=?, expires_at=?
           WHERE lease_id=? AND expires_at <= ? AND revoked=0""",
        (holder, new_exp, lease_id, now))
    conn.commit()
    if cur.rowcount != 1:
        return None, False
    cur = conn.execute("SELECT token_hash FROM leases WHERE lease_id=?",
                       (lease_id,))
    return ("<lease-scoped-token>", True)  # token intentionally not rotated
    cur = conn.execute(
        "SELECT holder_id, expires_at, revoked FROM leases WHERE lease_id=?",
        (lease_id,))
    r = cur.fetchone()
    return dict(r) if r else None


def apply_effect_holder(conn, scope_id, holder, step):
    """Lease-scoped EXTERNAL effect: each holder that believes it holds the
    lease performs the action once. Keyed per holder, so dual holders
    duplicate the real-world side effect (models e.g. sending the email)."""
    key = f"leasefx:{scope_id}:{holder}:{step}"
    conn.execute(
        "INSERT INTO effects(effect_key, packet_id, step, worker_id)"
        " VALUES (?,?,?,?)", (key, str(scope_id), step, holder))
    conn.commit()
    return True


def count_holder_effects(conn, scope_id):
    cur = conn.execute(
        "SELECT COUNT(*), COUNT(DISTINCT worker_id) FROM effects "
        "WHERE packet_id=? AND effect_key LIKE 'leasefx:%'", (str(scope_id),))
    return cur.fetchone()


def lease_holder(conn, lease_id):
    cur = conn.execute(
        "SELECT holder_id, expires_at, revoked FROM leases WHERE lease_id=?",
        (lease_id,))
    r = cur.fetchone()
    return dict(r) if r else None
