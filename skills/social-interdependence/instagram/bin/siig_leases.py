#!/usr/bin/env python3
"""siig_leases.py: single-writer leases for executing intents.

Instagram runs one executing worker per account (the log rule: one browser
task per pass on nolanpigi). A lease is acquired atomically (O_CREAT|O_EXCL)
before DISPATCHED -> ATTEMPTING and released at terminal states. A worker
that dies mid-attempt leaves an expired lease; reconcile() converts the
stranded intent to UNKNOWN and releases the lease. Two workers racing the
same intent: exactly one wins the O_EXCL create; the loser refuses.
"""
import json
import os
import time

from siig_common import STATE_ROOT, iso_now, ensure_state_dirs

LEASE_TTL_SEC = 300


def leases_dir():
    d = os.path.join(STATE_ROOT, "leases")
    os.makedirs(d, exist_ok=True)
    return d


def lease_path(intent_id):
    safe = intent_id.replace("/", "_").replace(":", "_")
    return os.path.join(leases_dir(), safe + ".json")


def acquire(intent_id, worker_id, ttl_sec=LEASE_TTL_SEC):
    """Returns the lease dict, or None when another worker holds it."""
    path = lease_path(intent_id)
    lease = {"intent_id": intent_id, "worker_id": worker_id,
             "acquired_at": iso_now(),
             "expires_at_epoch": time.time() + ttl_sec,
             "ttl_sec": ttl_sec}
    fd = None
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(lease, f, indent=1, sort_keys=True)
        return lease
    except FileExistsError:
        return None
    finally:
        pass


def heartbeat(intent_id, worker_id, ttl_sec=LEASE_TTL_SEC):
    path = lease_path(intent_id)
    try:
        with open(path, "r", encoding="utf-8") as f:
            lease = json.load(f)
    except (OSError, ValueError):
        return False
    if lease.get("worker_id") != worker_id:
        return False
    lease["expires_at_epoch"] = time.time() + ttl_sec
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(lease, f, indent=1, sort_keys=True)
    os.replace(tmp, path)
    return True


def release(intent_id, worker_id):
    path = lease_path(intent_id)
    try:
        with open(path, "r", encoding="utf-8") as f:
            lease = json.load(f)
    except (OSError, ValueError):
        return False
    if lease.get("worker_id") != worker_id:
        return False
    try:
        os.unlink(path)
    except OSError:
        return False
    return True


def is_expired(intent_id):
    path = lease_path(intent_id)
    try:
        with open(path, "r", encoding="utf-8") as f:
            lease = json.load(f)
    except (OSError, ValueError):
        return True
    return time.time() > lease.get("expires_at_epoch", 0)


def holder(intent_id):
    path = lease_path(intent_id)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("worker_id")
    except (OSError, ValueError):
        return None
