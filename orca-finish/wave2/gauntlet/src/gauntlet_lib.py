"""Gauntlet harness primitives: durable-execution mechanics under test.

Implements the boundary-table semantics (mechanism map records 1,6,7,8,10,13,14,15,17)
against the SCRATCH database ping_gauntlet (127.0.0.1:54339). Never production.
"""
import hashlib
import json
import secrets
import uuid

import psycopg

_PW = open("/home/nolan/.gauntlet-pg-pass").read().strip()
PG = dict(host="127.0.0.1", port=54339, dbname="ping_gauntlet",
          user="gauntlet", password=_PW)


def db():
    return psycopg.connect(**PG)


def _canon(o):
    return json.dumps(o, sort_keys=True, separators=(",", ":"))


def _sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


class StaleCheckpointError(Exception):
    pass


# ---- audit (record 17: immutable append-only) ----
def audit(conn, run_id, kind, detail):
    conn.execute(
        "INSERT INTO gauntlet.audit_events(run_id, kind, detail) VALUES (%s,%s,%s::jsonb)",
        (str(run_id), kind, _canon(detail)))


# ---- runs (record 1) ----
def new_run(conn, prompt_ref="gauntlet", tenant="gauntlet"):
    rid = uuid.uuid4()
    conn.execute(
        """INSERT INTO gauntlet.runs(run_id, tenant_id, status, prompt_ref,
              worktree_path, adapter, branch, started_at)
           VALUES (%s,%s,'RUNNING',%s,'/home/nolan/ping-gauntlet','synthetic',
              'orca-finish/gauntlet', now())""",
        (str(rid), tenant, prompt_ref))
    audit(conn, rid, "run.created", {"prompt_ref": prompt_ref})
    return rid


def set_run_status(conn, run_id, status):
    conn.execute(
        """UPDATE gauntlet.runs SET status=%s,
              completed_at=CASE WHEN %s IN ('COMPLETED','FAILED','OUTCOME_UNKNOWN')
                                THEN now() ELSE completed_at END
           WHERE run_id=%s""",
        (status, status, str(run_id)))
    audit(conn, run_id, "run.status", {"status": status})


def get_run(conn, run_id):
    cur = conn.execute(
        "SELECT status, lease_holder, fencing_token FROM gauntlet.runs WHERE run_id=%s",
        (str(run_id),))
    r = cur.fetchone()
    return dict(zip(["status", "lease_holder", "fencing_token"], r)) if r else None


# ---- packets (records 6, 14) ----
def new_packet(conn, run_id, kind="t", effect_class="TRANSACTIONAL",
               criteria="must complete honestly", payload=None, idem=None):
    pid = uuid.uuid4()
    idem = idem or f"idem-{uuid.uuid4().hex[:12]}"
    conn.execute(
        """INSERT INTO gauntlet.packets(packet_id, run_id, kind, status,
              acceptance_criteria, effect_class, idempotency_key, payload)
           VALUES (%s,%s,%s,'ENQUEUED',%s,%s,%s,%s::jsonb)""",
        (str(pid), str(run_id), kind, criteria, effect_class, idem,
         _canon(payload or {})))
    audit(conn, run_id, "packet.enqueued", {"packet_id": str(pid), "kind": kind})
    return pid


def claim_packet(conn, packet_id, worker_id, fencing):
    """Atomic claim: exactly one winner. Returns True iff this caller won."""
    cur = conn.execute(
        """UPDATE gauntlet.packets
              SET status='CLAIMED', claimed_by=%s, claim_fencing=%s, updated_at=now()
            WHERE packet_id=%s AND status='ENQUEUED'""",
        (worker_id, fencing, str(packet_id)))
    return cur.rowcount == 1


def reclaim_packet(conn, packet_id, old_worker, new_worker, new_fencing):
    """Take over a CLAIMED/IN_FLIGHT packet whose holder the caller verified dead."""
    cur = conn.execute(
        """UPDATE gauntlet.packets
              SET claimed_by=%s, claim_fencing=%s, attempt_seq=attempt_seq+1,
                  updated_at=now()
            WHERE packet_id=%s AND claimed_by=%s AND status IN ('CLAIMED','IN_FLIGHT')""",
        (new_worker, new_fencing, str(packet_id), old_worker))
    return cur.rowcount == 1


def set_packet(conn, packet_id, status, result_ref=None):
    conn.execute(
        """UPDATE gauntlet.packets
              SET status=%s, result_ref=COALESCE(%s,result_ref), updated_at=now()
            WHERE packet_id=%s""",
        (status, result_ref, str(packet_id)))


def get_packet(conn, packet_id):
    cur = conn.execute(
        """SELECT packet_id, status, claimed_by, claim_fencing, attempt_seq,
                  coordinator_epoch, result_ref
           FROM gauntlet.packets WHERE packet_id=%s""", (str(packet_id),))
    r = cur.fetchone()
    if not r:
        return None
    return dict(zip(["packet_id", "status", "claimed_by", "claim_fencing",
                     "attempt_seq", "coordinator_epoch", "result_ref"], r))


def count_audit(conn, run_id, kind, step=None):
    if step is None:
        cur = conn.execute(
            "SELECT COUNT(*) FROM gauntlet.audit_events WHERE run_id=%s AND kind=%s",
            (str(run_id), kind))
    else:
        cur = conn.execute(
            """SELECT COUNT(*) FROM gauntlet.audit_events
               WHERE run_id=%s AND kind=%s AND (detail->>'step')::int=%s""",
            (str(run_id), kind, step))
    return cur.fetchone()[0]


# ---- checkpoints (record 7) ----
def checkpoint(conn, run_id, state):
    digest = _sha(_canon(state))
    cur = conn.execute(
        """INSERT INTO gauntlet.checkpoints(run_id, checkpoint_id, state, state_digest)
           SELECT %s, COALESCE(MAX(checkpoint_id),0)+1, %s::jsonb, %s
             FROM gauntlet.checkpoints WHERE run_id=%s
           RETURNING checkpoint_id""",
        (str(run_id), _canon(state), digest, str(run_id)))
    cid = cur.fetchone()[0]
    audit(conn, run_id, "checkpoint.saved",
          {"checkpoint_id": cid, "digest": digest[:12]})
    return cid


def latest_checkpoint(conn, run_id):
    cur = conn.execute(
        """SELECT checkpoint_id, state, state_digest FROM gauntlet.checkpoints
           WHERE run_id=%s ORDER BY checkpoint_id DESC LIMIT 1""",
        (str(run_id),))
    r = cur.fetchone()
    return {"checkpoint_id": r[0], "state": r[1], "digest": r[2]} if r else None


def restore_checkpoint(conn, run_id, checkpoint_id):
    """Refuses stale restores: a newer checkpoint exists -> StaleCheckpointError."""
    cur = conn.execute(
        "SELECT MAX(checkpoint_id) FROM gauntlet.checkpoints WHERE run_id=%s",
        (str(run_id),))
    mx = cur.fetchone()[0] or 0
    if checkpoint_id < mx:
        audit(conn, run_id, "checkpoint.stale_refused",
              {"requested": checkpoint_id, "latest": mx})
        raise StaleCheckpointError(
            f"requested checkpoint {checkpoint_id} but latest is {mx}")
    cur = conn.execute(
        """SELECT state, state_digest FROM gauntlet.checkpoints
           WHERE run_id=%s AND checkpoint_id=%s""",
        (str(run_id), checkpoint_id))
    r = cur.fetchone()
    if not r:
        raise StaleCheckpointError(f"checkpoint {checkpoint_id} does not exist")
    state, digest = r
    if _sha(_canon(state)) != digest:
        audit(conn, run_id, "checkpoint.digest_mismatch",
              {"checkpoint_id": checkpoint_id})
        raise StaleCheckpointError("checkpoint digest mismatch: refusing")
    audit(conn, run_id, "checkpoint.restored", {"checkpoint_id": checkpoint_id})
    return state


# ---- leases (records 10, 13) ----
def lease_issue(conn, lease_id, holder, ttl_s, scope="gauntlet/scratch",
                role="executor", tools=None):
    token = secrets.token_hex(32)
    conn.execute(
        """INSERT INTO gauntlet.leases(lease_id, holder_id, scope, role,
              allowed_tools, token_hash, expires_at)
           VALUES (%s,%s,%s,%s,%s,%s, now() + (%s || ' seconds')::interval)""",
        (lease_id, holder, scope, role, tools or ["*"], _sha(token), str(ttl_s)))
    return token


def lease_valid(conn, lease_id, token):
    cur = conn.execute(
        "SELECT token_hash, expires_at, revoked FROM gauntlet.leases WHERE lease_id=%s",
        (lease_id,))
    r = cur.fetchone()
    if not r:
        return False
    th, exp, revoked = r
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    return (not revoked) and (th == _sha(token)) and (exp > now)


def lease_revoke(conn, lease_id):
    conn.execute("UPDATE gauntlet.leases SET revoked=true WHERE lease_id=%s",
                 (lease_id,))


# ---- tool calls (record 8: side-effect boundary) ----
def tool_submit(conn, run_id, packet_id, tool, effect_class, idem):
    cid = uuid.uuid4()
    conn.execute(
        """INSERT INTO gauntlet.tool_calls(call_id, run_id, packet_id, tool_name,
              effect_class, idempotency_key, status)
           VALUES (%s,%s,%s,%s,%s,%s,'SUBMITTED')""",
        (str(cid), str(run_id), str(packet_id) if packet_id else None,
         tool, effect_class, idem))
    return cid


def tool_ack(conn, call_id):
    """Externally observable ack: the side-effect boundary has been crossed."""
    conn.execute(
        "UPDATE gauntlet.tool_calls SET status='ACKED', effect_ack_at=now() "
        "WHERE call_id=%s", (str(call_id),))


def tool_timeout(conn, call_id):
    """Timeout classification. Post-boundary -> OUTCOME_UNKNOWN (never FAILED,
    never blind-retried). Pre-boundary -> FAILED (safe to requeue)."""
    cur = conn.execute(
        "SELECT status, effect_ack_at FROM gauntlet.tool_calls WHERE call_id=%s",
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
        "UPDATE gauntlet.tool_calls SET status='TIMED_OUT', outcome=%s, evidence=%s "
        "WHERE call_id=%s", (outcome, evidence, str(call_id)))
    return outcome


def get_tool_call(conn, call_id):
    cur = conn.execute(
        """SELECT status, outcome, effect_class, evidence FROM gauntlet.tool_calls
           WHERE call_id=%s""", (str(call_id),))
    r = cur.fetchone()
    return dict(zip(["status", "outcome", "effect_class", "evidence"], r)) if r else None


# ---- coordinator epoch (record 14) ----
COORD_LOCK_KEY = 424242


def coord_claim(conn):
    """PG advisory-lock single-coordinator claim. The caller must hold `conn`
    open for the whole reign; a crash drops the session and frees the lock."""
    cur = conn.execute("SELECT pg_try_advisory_lock(%s)", (COORD_LOCK_KEY,))
    return bool(cur.fetchone()[0])


def coord_epoch_bump(conn):
    cur = conn.execute(
        "UPDATE gauntlet.coordinator_epoch SET epoch=epoch+1, heartbeat_at=now() "
        "WHERE id=1 RETURNING epoch")
    return cur.fetchone()[0]


def coord_epoch(conn):
    cur = conn.execute("SELECT epoch FROM gauntlet.coordinator_epoch WHERE id=1")
    return cur.fetchone()[0]


def fenced_packet_write(conn, packet_id, epoch, status):
    """Epoch-fenced write: a deposed coordinator's late write is rejected."""
    cur = conn.execute(
        """UPDATE gauntlet.packets SET status=%s, updated_at=now()
           WHERE packet_id=%s AND coordinator_epoch=%s""",
        (status, str(packet_id), epoch))
    return cur.rowcount


def set_packet_epoch(conn, packet_id, epoch):
    conn.execute("UPDATE gauntlet.packets SET coordinator_epoch=%s WHERE packet_id=%s",
                 (epoch, str(packet_id)))
