#!/usr/bin/env python3
"""Durable-state primitives for the Facebook autonomous engagement slice.

Append-only JSONL stores with fsync on every append (same durability
contract as action-intent-ledger.jsonl: a crash may lose nothing that was
acknowledged), atomic read-modify-write with an flock guard for budgets and
leases, and a fold function that replays the record stream into per-intent
current state. Replay here is DECISION replay: the stream is re-folded to
reconstruct state; external mutations are never replayed.

State root is taken from SI_FB_STATE (tests point it at a scratch dir).
Nothing here touches production outreach state.
"""
import fcntl
import json
import os
import time
from contextlib import contextmanager
from datetime import datetime, timezone

STATE_ROOT = os.environ.get(
    "SI_FB_STATE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)),
                 "..", "state"))


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def _path(name):
    os.makedirs(STATE_ROOT, exist_ok=True)
    return os.path.join(STATE_ROOT, name)


@contextmanager
def _locked(path, mode):
    """Open path and hold an exclusive flock for the duration."""
    fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        with os.fdopen(fd, mode) as f:
            yield f
    finally:
        pass  # fdopen closes the fd, releasing the lock


def append_jsonl(name, record):
    """Append one JSONL record, fsync'd. Never mutates existing records."""
    path = _path(name)
    rec = dict(record)
    rec.setdefault("ts", utcnow())
    line = json.dumps(rec, sort_keys=True, separators=(",", ":")) + "\n"
    with _locked(path, "a") as f:
        f.write(line)
        f.flush()
        os.fsync(f.fileno())
    return rec


def read_jsonl(name):
    path = _path(name)
    if not os.path.isfile(path):
        return []
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def read_json(name, default=None):
    path = _path(name)
    if not os.path.isfile(path):
        return default
    # An empty file is treated as absent: _locked() creates files with
    # O_CREAT, so a kill between create and write leaves a zero-byte file.
    # Crash-safe readers must not mistake that for corrupt state.
    if os.path.getsize(path) == 0:
        return default
    with _locked(path, "r") as f:
        return json.load(f)


def write_json_atomic(name, obj):
    """Atomic JSON write: tmp file + fsync + os.replace, under flock."""
    path = _path(name)
    tmp = path + ".tmp.%d" % os.getpid()
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, sort_keys=True)
        f.write("\n")
        f.flush()
        os.fsync(f.fileno())
    with _locked(path, "r+") as _:
        os.replace(tmp, path)


def fold_intents():
    """Fold the intent record stream into per-intent current state.

    Returns {intent_id: {"state": ..., "history": [...], "record": ...}}.
    Transition records carry evidence; the fold is deterministic.
    """
    intents = {}
    for rec in read_jsonl("intents.jsonl"):
        iid = rec.get("intent_id")
        if not iid:
            continue
        st = intents.get(iid)
        if st is None:
            st = {"state": None, "history": [], "record": {}}
            intents[iid] = st
        if rec.get("record_type") == "intent":
            st["record"] = rec
            st["state"] = rec.get("state", "INTENT_CREATED")
            st["history"].append(("INTENT_CREATED", rec.get("ts")))
        elif rec.get("record_type") == "transition":
            st["state"] = rec["to_state"]
            st["history"].append((rec["to_state"], rec.get("ts")))
    return intents


# ---------------------------------------------------------------- budgets
# Budget ledger: budgets.json holds {scope_key: {consumed, window_start}}.
# consume() is atomic under flock: check-then-consume cannot race two
# schedulers, which is the mechanism that makes the budget race test pass.
def budget_consume(scope_key, limit, window_sec, now=None):
    """Atomically consume one unit of budget. Returns (ok, remaining)."""
    now = now if now is not None else time.time()
    path = _path("budgets.json")
    with _locked(path, "r+") as f:
        try:
            f.seek(0)
            data = json.load(f) if os.fstat(f.fileno()).st_size else {}
        except (ValueError, OSError):
            data = {}
        entry = data.get(scope_key) or {}
        if now - entry.get("window_start", 0) >= window_sec:
            entry = {"consumed": 0, "window_start": now}
        if entry["consumed"] >= limit:
            return False, 0
        entry["consumed"] += 1
        data[scope_key] = entry
        f.seek(0)
        f.truncate()
        json.dump(data, f, indent=1, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
        return True, limit - entry["consumed"]


def budget_consumed(scope_key, window_sec, now=None):
    now = now if now is not None else time.time()
    data = read_json("budgets.json", {}) or {}
    entry = data.get(scope_key) or {}
    if now - entry.get("window_start", 0) >= window_sec:
        return 0
    return entry.get("consumed", 0)


# ---------------------------------------------------------------- leases
def lease_acquire(name, holder, ttl_sec, now=None):
    """Acquire a named lease. Returns True when acquired or already held by
    holder; False when held by someone else and not expired."""
    now = now if now is not None else time.time()
    path = _path("leases.json")
    with _locked(path, "r+") as f:
        try:
            f.seek(0)
            data = json.load(f) if os.fstat(f.fileno()).st_size else {}
        except (ValueError, OSError):
            data = {}
        cur = data.get(name)
        if cur and cur.get("holder") != holder and now < cur.get("expires", 0):
            return False
        data[name] = {"holder": holder, "acquired": now,
                      "expires": now + ttl_sec}
        f.seek(0)
        f.truncate()
        json.dump(data, f, indent=1, sort_keys=True)
        f.flush()
        os.fsync(f.fileno())
        return True


def lease_release(name, holder):
    path = _path("leases.json")
    with _locked(path, "r+") as f:
        try:
            f.seek(0)
            data = json.load(f) if os.fstat(f.fileno()).st_size else {}
        except (ValueError, OSError):
            data = {}
        cur = data.get(name)
        if cur and cur.get("holder") == holder:
            del data[name]
            f.seek(0)
            f.truncate()
            json.dump(data, f, indent=1, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
            return True
        return False


def lease_holder(name, now=None):
    now = now if now is not None else time.time()
    data = read_json("leases.json", {}) or {}
    cur = data.get(name)
    if cur and now < cur.get("expires", 0):
        return cur.get("holder")
    return None
