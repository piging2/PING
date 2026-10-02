#!/usr/bin/env python3
"""siig_breakers.py: scoped circuit breakers.

Scopes: action (like/comment), account (nolanpigi), adapter, platform
(instagram), tenant. Trip causes: consecutive failures >= threshold in a
scope, or an affirmative platform signal (action block, checkpoint, warning,
rate limit) which opens the PLATFORM scope immediately. While any scope on
the intent's path is open, NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN refuses
the ATTEMPTING transition. Breakers cool down after cooldown_sec into
half-open; exactly one probe action may run; success closes, failure reopens.
Breakers never grant authority; they only stop.
"""
import os
import time

from siig_common import (STATE_ROOT, atomic_write_json, read_json, iso_now,
                         PLATFORM, ACCOUNT)

SCOPES = ("action:like", "action:comment", "account:%s" % ACCOUNT,
          "adapter", "platform:%s" % PLATFORM, "tenant")

FAILURE_THRESHOLD = 5
UNKNOWN_THRESHOLD = 3
COOLDOWN_SEC = 3600


def path():
    return os.path.join(STATE_ROOT, "breakers.json")


def load():
    data = read_json(path(), {})
    for scope in SCOPES:
        data.setdefault(scope, {"state": "closed", "failures": 0,
                                "unknowns": 0, "opened_at": None,
                                "reason": None, "half_open_probe": None})
    return data


def save(data):
    atomic_write_json(path(), data)


def scopes_for(action):
    return ["action:%s" % action, "account:%s" % ACCOUNT, "adapter",
            "platform:%s" % PLATFORM, "tenant"]


def _refresh(scope_rec):
    if scope_rec["state"] == "open" and scope_rec["opened_at"]:
        if time.time() - scope_rec["opened_at"] >= COOLDOWN_SEC:
            scope_rec["state"] = "half-open"
            scope_rec["half_open_probe"] = None
    return scope_rec


def is_open(action):
    """True when any scope on the intent's path blocks execution."""
    data = load()
    changed = False
    blocked = False
    for scope in scopes_for(action):
        rec = _refresh(data[scope])
        if rec["state"] != data[scope]["state"]:
            changed = True
        if rec["state"] == "open":
            blocked = True
        elif rec["state"] == "half-open":
            blocked = True  # probe is admitted separately via claim_probe
    if changed:
        save(data)
    return blocked


def breaker_allows(action):
    """True when no scope on the intent's path blocks execution. A
    half-open scope admits exactly one probe; the probe slot is claimed
    here atomically with the check."""
    data = load()
    for scope in scopes_for(action):
        rec = _refresh(data[scope])
        if rec["state"] == "open":
            save(data)
            return False
        if rec["state"] == "half-open":
            if rec["half_open_probe"] is not None:
                save(data)
                return False
            rec["half_open_probe"] = iso_now()
    save(data)
    return True


def claim_probe(action):
    """Admit exactly one half-open probe per scope. Returns True if this
    caller owns the probe slot."""
    data = load()
    ok = True
    for scope in scopes_for(action):
        rec = _refresh(data[scope])
        if rec["state"] == "half-open":
            if rec["half_open_probe"] is not None:
                ok = False
            elif ok:
                rec["half_open_probe"] = iso_now()
    save(data)
    return ok


def record_success(action):
    data = load()
    for scope in scopes_for(action):
        rec = data[scope]
        rec["failures"] = 0
        rec["unknowns"] = 0
        if rec["state"] in ("half-open", "open"):
            rec["state"] = "closed"
            rec["opened_at"] = None
            rec["reason"] = None
            rec["half_open_probe"] = None
    save(data)


def record_failure(action, reason="consecutive failure threshold"):
    data = load()
    for scope in scopes_for(action):
        rec = data[scope]
        rec["failures"] += 1
        if rec["failures"] >= FAILURE_THRESHOLD and rec["state"] == "closed":
            rec["state"] = "open"
            rec["opened_at"] = time.time()
            rec["reason"] = reason
    save(data)


def record_unknown(action):
    data = load()
    for scope in scopes_for(action):
        rec = data[scope]
        rec["unknowns"] += 1
        if rec["unknowns"] >= UNKNOWN_THRESHOLD and rec["state"] == "closed":
            rec["state"] = "open"
            rec["opened_at"] = time.time()
            rec["reason"] = "unknown-outcome threshold"
    save(data)


def trip_platform(reason):
    """Affirmative platform signal: action block, checkpoint, warning, rate
    limit. Opens the platform scope immediately."""
    data = load()
    rec = data["platform:%s" % PLATFORM]
    rec["state"] = "open"
    rec["opened_at"] = time.time()
    rec["reason"] = reason
    save(data)
