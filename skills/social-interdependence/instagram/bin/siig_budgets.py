#!/usr/bin/env python3
"""siig_budgets.py: restart-durable, atomically-consumed action budgets.

Ceilings come from the autonomy envelope (operator-set, never learner-set):
  likes_per_pass = 50, comments_per_pass = 12 (Nolan's standing ceilings),
  weekly ramp +5 likes / +3 comments from the 2026-09-26 epoch.

Semantics: reserve at INTENT_CREATED (an ELIGIBLE action claims a slot);
commit at VERIFIED_SUCCESS; release at FAILED_TERMINAL / CANCELLED /
REJECTED / VERIFIED_NOOP / DEFERRED-window-expiry. Atomic consumption uses
an fcntl exclusive lock so two workers racing the last slot cannot both win.
The learner may never raise its own ceiling; ceiling changes arrive only via
a new envelope version.
"""
import fcntl
import json
import os
import threading
import time
from datetime import datetime, timezone

from siig_common import STATE_ROOT, atomic_write_json, read_json, iso_now

# fcntl locks do not exclude threads of the same process (POSIX locks are
# per-process), so a threading lock serializes in-process racers while the
# fcntl lock serializes cross-process racers.
_THREAD_LOCK = threading.Lock()

BASE_LIKES = 50
BASE_COMMENTS = 12
RAMP_LIKES_PER_WEEK = 5
RAMP_COMMENTS_PER_WEEK = 3
RAMP_EPOCH = datetime(2026, 9, 26, tzinfo=timezone.utc)
PASS_WINDOW_SEC = 2 * 3600


def budget_path():
    return os.path.join(STATE_ROOT, "budget.json")


def lock_path():
    return os.path.join(STATE_ROOT, "budget.lock")


def current_ceilings(now=None):
    now = now or datetime.now(timezone.utc)
    weeks = max(0, int((now - RAMP_EPOCH).total_seconds() // (7 * 86400)))
    return {
        "likes": BASE_LIKES + RAMP_LIKES_PER_WEEK * weeks,
        "comments": BASE_COMMENTS + RAMP_COMMENTS_PER_WEEK * weeks,
        "ramp_weeks": weeks,
        "epoch": RAMP_EPOCH.isoformat(),
    }


def window_key(now=None):
    now = now or datetime.now(timezone.utc)
    epoch = int(now.timestamp())
    return str(epoch - (epoch % PASS_WINDOW_SEC))


def _blank(key):
    return {"window_key": key, "likes_reserved": 0, "likes_committed": 0,
            "comments_reserved": 0, "comments_committed": 0,
            "updated_at": iso_now()}


class BudgetStore:
    """Serialized access to budget.json. All mutating ops hold the lock."""

    def _load(self):
        key = window_key()
        data = read_json(budget_path())
        if not data or data.get("window_key") != key:
            data = _blank(key)
        return data

    def _locked(self):
        _THREAD_LOCK.acquire()
        os.makedirs(STATE_ROOT, exist_ok=True)
        fh = open(lock_path(), "w")
        fcntl.flock(fh, fcntl.LOCK_EX)
        return fh

    def _unlocked(self, fh):
        try:
            fcntl.flock(fh, fcntl.LOCK_UN)
        finally:
            fh.close()
            _THREAD_LOCK.release()

    def snapshot(self):
        fh = self._locked()
        try:
            data = self._load()
            ceilings = current_ceilings()
            return {
                "window_key": data["window_key"],
                "likes": {"reserved": data["likes_reserved"],
                          "committed": data["likes_committed"],
                          "ceiling": ceilings["likes"]},
                "comments": {"reserved": data["comments_reserved"],
                             "committed": data["comments_committed"],
                             "ceiling": ceilings["comments"]},
                "ramp_weeks": ceilings["ramp_weeks"],
            }
        finally:
            self._unlocked(fh)

    def reserve(self, action):
        """Atomically reserve one slot. Returns True when reserved."""
        key = "likes" if action == "like" else "comments"
        fh = self._locked()
        try:
            data = self._load()
            ceilings = current_ceilings()
            if data[key + "_reserved"] >= ceilings[key]:
                return False
            data[key + "_reserved"] += 1
            data["updated_at"] = iso_now()
            atomic_write_json(budget_path(), data)
            return True
        finally:
            self._unlocked(fh)

    def release(self, action):
        key = "likes" if action == "like" else "comments"
        fh = self._locked()
        try:
            data = self._load()
            data[key + "_reserved"] = max(0, data[key + "_reserved"] - 1)
            data["updated_at"] = iso_now()
            atomic_write_json(budget_path(), data)
        finally:
            self._unlocked(fh)

    def commit(self, action):
        """Move one reserved slot to committed (called at VERIFIED_SUCCESS)."""
        key = "likes" if action == "like" else "comments"
        fh = self._locked()
        try:
            data = self._load()
            data[key + "_reserved"] = max(0, data[key + "_reserved"] - 1)
            data[key + "_committed"] += 1
            data["updated_at"] = iso_now()
            atomic_write_json(budget_path(), data)
        finally:
            self._unlocked(fh)
