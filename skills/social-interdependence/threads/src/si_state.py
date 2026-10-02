#!/usr/bin/env python3
"""Durable state for the Threads social-interdependence loop.

Append-only JSONL journal + sha256-chained transition log + file-locked
budget ledger + lease files. Everything is restart-durable: a kill between
any two transitions is recovered by reconcile, which reads the journal and
external state, never by re-dispatching mutations.

State directory: SI_THREADS_STATE_DIR (tests point it at a scratch dir).
Default: the skill's hidden .state/ directory. NEVER the production
action-intent-ledger.jsonl unless the caller explicitly sets it.
"""
import fcntl
import hashlib
import json
import os
import time
from datetime import datetime, timezone

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def state_dir():
    """Resolved dynamically so SI_THREADS_STATE_DIR may be redirected per
    process lifetime (tests point it at a scratch dir)."""
    return os.environ.get("SI_THREADS_STATE_DIR",
                          os.path.join(SKILL_DIR, ".state"))

TERMINAL = {"VERIFIED_SUCCESS", "VERIFIED_NOOP", "FAILED_TERMINAL", "CANCELLED"}
OPEN = {"DISPATCHED", "ATTEMPTING", "UNKNOWN", "VERIFYING", "SAFE_RETRY"}

GENESIS_HASH = "0" * 64


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def _sha(obj):
    canon = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def ensure_state_dir():
    os.makedirs(state_dir(), exist_ok=True)
    for sub in ("evidence", "leases", "reads"):
        os.makedirs(os.path.join(state_dir(), sub), exist_ok=True)


def _locked(path, mode):
    f = open(path, mode)
    fcntl.flock(f.fileno(), fcntl.LOCK_EX)
    return f


def append_jsonl(name, record):
    ensure_state_dir()
    path = os.path.join(state_dir(), name)
    f = _locked(path, "a")
    try:
        f.write(json.dumps(record, sort_keys=True) + "\n")
        f.flush()
        os.fsync(f.fileno())
    finally:
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        f.close()
    return record


def read_jsonl(name):
    path = os.path.join(state_dir(), name)
    if not os.path.isfile(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


# ---------------------------------------------------------------- intents
def intent_path():
    return os.path.join(state_dir(), "intents.jsonl")


def load_intents():
    return {r["intent_id"]: r for r in read_jsonl("intents.jsonl")}


def save_intent(intent):
    """Upsert by intent_id: stable identity, never duplicated."""
    ensure_state_dir()
    intents = load_intents()
    intents[intent["intent_id"]] = intent
    tmp = intent_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        for iid in sorted(intents):
            f.write(json.dumps(intents[iid], sort_keys=True) + "\n")
    os.replace(tmp, intent_path())
    return intent


def get_intent(intent_id):
    return load_intents().get(intent_id)


# -------------------------------------------------------------- transitions
LEGAL = {
    "DISCOVERED": {"NORMALIZED", "CANCELLED"},
    "NORMALIZED": {"EVALUATED", "CANCELLED"},
    "EVALUATED": {"ELIGIBLE", "REJECTED", "CANCELLED"},
    "ELIGIBLE": {"INTENT_CREATED", "DEFERRED", "CANCELLED"},
    "REJECTED": set(),
    "INTENT_CREATED": {"QUEUED", "CANCELLED"},
    "QUEUED": {"SCHEDULED", "DEFERRED", "CANCELLED"},
    "SCHEDULED": {"DISPATCHED", "DEFERRED", "CANCELLED"},
    "DISPATCHED": {"ATTEMPTING", "FAILED_RETRYABLE", "CANCELLED"},
    "ATTEMPTING": {"VERIFYING", "UNKNOWN", "FAILED_RETRYABLE", "CANCELLED"},
    "UNKNOWN": {"VERIFYING", "SAFE_RETRY", "UNKNOWN", "CANCELLED"},
    "VERIFYING": {"VERIFIED_SUCCESS", "VERIFIED_NOOP", "FAILED_TERMINAL",
                  "FAILED_RETRYABLE", "UNKNOWN", "CANCELLED"},
    "VERIFIED_SUCCESS": set(),
    "VERIFIED_NOOP": set(),
    "SAFE_RETRY": {"SCHEDULED", "CANCELLED"},
    "DEFERRED": {"SCHEDULED", "CANCELLED"},
    "FAILED_RETRYABLE": {"SCHEDULED", "VERIFYING", "FAILED_TERMINAL",
                        "CANCELLED"},
    "FAILED_TERMINAL": set(),
    "CANCELLED": set(),
}


class IllegalTransition(Exception):
    pass


def _chain_head():
    rows = read_jsonl("transitions.jsonl")
    return rows[-1] if rows else None


def record_transition(intent_id, to_state, actor, evidence_refs, note=""):
    """Persist one transition with hash chaining. Illegal transitions are
    rejected, never written."""
    ensure_state_dir()
    intent = get_intent(intent_id)
    from_state = intent["state"] if intent else "DISCOVERED"
    if intent and to_state not in LEGAL.get(from_state, set()):
        raise IllegalTransition(
            "%s: %s -> %s is not a legal transition"
            % (intent_id, from_state, to_state))
    head = _chain_head()
    prev_hash = head["hash"] if head else GENESIS_HASH
    seq = (head["seq"] + 1) if head else 0
    rec = {"seq": seq, "intent_id": intent_id, "from_state": from_state,
           "to_state": to_state, "at": utcnow(), "actor": actor,
           "evidence_refs": list(evidence_refs), "note": note,
           "prev_hash": prev_hash}
    rec["hash"] = _sha({k: v for k, v in rec.items() if k != "hash"})
    if head and head["hash"] != prev_hash:
        raise IllegalTransition("transition chain fork detected")
    append_jsonl("transitions.jsonl", rec)
    if intent:
        intent["state"] = to_state
        save_intent(intent)
    return rec


def verify_chain():
    """Replay the transition log and verify the hash chain. Returns
    (ok, error). Replay reconstructs state; it never dispatches mutations."""
    rows = read_jsonl("transitions.jsonl")
    prev = GENESIS_HASH
    for i, r in enumerate(rows):
        if r["seq"] != i:
            return False, "seq gap at %d" % i
        if r["prev_hash"] != prev:
            return False, "chain break at seq %d" % i
        h = _sha({k: v for k, v in r.items() if k != "hash"})
        if h != r["hash"]:
            return False, "hash mismatch at seq %d" % i
        prev = r["hash"]
    return True, ""


def replay_states():
    """Decision replay: derive current state per intent from the transition
    log alone (no mutation replay)."""
    states = {}
    for r in read_jsonl("transitions.jsonl"):
        states[r["intent_id"]] = r["to_state"]
    return states


# ----------------------------------------------------------------- budgets
def _budget_path():
    return os.path.join(state_dir(), "budget.jsonl")


def window_key(action, window_sec, now=None):
    t = int((now or time.time()) // window_sec)
    return "%s:%d" % (action, t)


def budget_remaining(action, per_pass_cap, window_sec, now=None):
    key = window_key(action, window_sec, now=now)
    used = sum(r["consumed"] for r in read_jsonl("budget.jsonl")
               if r["window_key"] == key and r["action"] == action)
    return max(0, per_pass_cap - used), key


def consume_budget(action, intent_id, batch_id, account, per_pass_cap,
                   window_sec, envelope_ref, n=1, now=None):
    """Atomically consume n budget units. File-locked: concurrent consumers
    serialize; the unit is issued exactly once."""
    ensure_state_dir()
    f = _locked(_budget_path(), "a+")
    try:
        f.seek(0)
        used = 0
        key = window_key(action, window_sec, now=now)
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r["window_key"] == key and r["action"] == action:
                used += r["consumed"]
        remaining = per_pass_cap - used - n
        if remaining < 0:
            return None
        rec = {"at": utcnow(), "window_key": key, "action": action,
               "authorized_account": account, "batch_id": batch_id,
               "intent_id": intent_id, "consumed": n,
               "remaining_after": remaining, "envelope_ref": envelope_ref}
        f.seek(0, 2)
        f.write(json.dumps(rec, sort_keys=True) + "\n")
        f.flush()
        os.fsync(f.fileno())
        return rec
    finally:
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        f.close()


# ------------------------------------------------------------------ leases
def acquire_lease(lease_id, owner, ttl_sec=600):
    """One worker per pass. Returns True if acquired, False if a valid lease
    is held by someone else."""
    ensure_state_dir()
    path = os.path.join(state_dir(), "leases", lease_id + ".json")
    now = time.time()
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                cur = json.load(f)
            if cur.get("expires_at", 0) > now and cur.get("owner") != owner:
                return False
        except (OSError, ValueError):
            pass
    rec = {"lease_id": lease_id, "owner": owner,
           "acquired_at": utcnow(), "expires_at": now + ttl_sec}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rec, f, sort_keys=True)
    os.replace(tmp, path)
    return True


def release_lease(lease_id, owner):
    path = os.path.join(state_dir(), "leases", lease_id + ".json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            cur = json.load(f)
        if cur.get("owner") == owner:
            os.remove(path)
            return True
    except (OSError, ValueError):
        pass
    return False


def lease_valid(lease_id):
    path = os.path.join(state_dir(), "leases", lease_id + ".json")
    if not os.path.isfile(path):
        return False
    try:
        with open(path, "r", encoding="utf-8") as f:
            cur = json.load(f)
        return cur.get("expires_at", 0) > time.time()
    except (OSError, ValueError):
        return False


# ------------------------------------------------------- relationship ledger
def record_touch(handle, intent_id, outcome):
    append_jsonl("relationship.jsonl",
                 {"at": utcnow(), "handle": handle.lower(),
                  "intent_id": intent_id, "outcome": outcome})


def touches_since(handle, since_ts):
    rows = read_jsonl("relationship.jsonl")
    return [r for r in rows
            if r["handle"] == handle.lower() and r["at"] >= since_ts]
