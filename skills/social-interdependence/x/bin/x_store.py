#!/usr/bin/env python3
"""Durable state for the X autonomy loop: journal, budgets, leases, circuits.

All state is file-backed and restart-durable. The journal is append-only;
state is derived by replaying it (decision replay, never mutation replay).
Budgets are consumed atomically under fcntl locks so concurrent workers
cannot overspend a ceiling. Circuit state reproduces the x-probe precedent
(~/workspace/pig-fb/x-probe-circuit.json semantics): consecutive timeouts
open the scope, no probe or execution while open, machine-readable reason.
"""
import fcntl
import hashlib
import json
import os
from contextlib import contextmanager
from datetime import datetime, timezone

from x_invariants import assert_legal_transition

LEGAL_TRANSITIONS = {
    "DISCOVERED": ("NORMALIZED", "CANCELLED"),
    "NORMALIZED": ("EVALUATED", "CANCELLED"),
    "EVALUATED": ("ELIGIBLE", "REJECTED", "CANCELLED"),
    "ELIGIBLE": ("INTENT_CREATED", "CANCELLED"),
    "INTENT_CREATED": ("QUEUED", "CANCELLED"),
    "QUEUED": ("SCHEDULED", "DEFERRED", "CANCELLED"),
    "SCHEDULED": ("DISPATCHED", "DEFERRED", "CANCELLED"),
    # DISPATCHED -> VERIFYING is the crash-recovery path only: the adapter
    # may have executed before the process died, so the first legal move is
    # a verification read, never a re-dispatch.
    "DISPATCHED": ("ATTEMPTING", "VERIFYING", "CANCELLED"),
    # ATTEMPTING -> DEFERRED: the platform refused the attempt without a
    # mutation (429 rate limit, 401/403 auth rejection). The attempt is
    # parked, not failed: the refusal is about the request, not the target.
    "ATTEMPTING": ("VERIFYING", "UNKNOWN", "DEFERRED", "FAILED_TERMINAL",
                   "CANCELLED"),
    "UNKNOWN": ("VERIFYING", "SAFE_RETRY", "FAILED_TERMINAL", "CANCELLED"),
    "VERIFYING": ("VERIFIED_SUCCESS", "VERIFIED_NOOP", "SAFE_RETRY",
                  "FAILED_RETRYABLE", "FAILED_TERMINAL", "CANCELLED"),
    "SAFE_RETRY": ("SCHEDULED", "DEFERRED", "CANCELLED"),
    "FAILED_RETRYABLE": ("SCHEDULED", "DEFERRED", "CANCELLED"),
    "DEFERRED": ("SCHEDULED", "CANCELLED"),
    "VERIFIED_SUCCESS": (),
    "VERIFIED_NOOP": (),
    "FAILED_TERMINAL": (),
    "CANCELLED": (),
}

GENESIS_PREV = "GENESIS"


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False)


def sha256_hex(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


@contextmanager
def _locked(path, mode):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, mode) as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield f
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


class Journal:
    """Append-only transition journal. Each record carries seq, prev_hash and
    hash = sha256(prev_hash + canonical(transition body)), so tampering or
    reordering is detectable. State is derived by replaying the journal."""

    def __init__(self, path, clock=utcnow):
        self.path = path
        self.clock = clock

    def _read_all(self):
        if not os.path.isfile(self.path):
            return []
        with _locked(self.path, "r") as f:
            return [json.loads(line) for line in f if line.strip()]

    def records(self):
        return self._read_all()

    def derive(self):
        """Replay the journal into {intent_id: current record}."""
        state = {}
        for rec in self._read_all():
            iid = rec["intent_id"]
            cur = state.get(iid, {})
            cur.update({
                "intent_id": iid,
                "state": rec["to_state"],
                "seq": rec["seq"],
                "identity_key": rec.get("identity_key")
                or cur.get("identity_key"),
                "terminal": rec.get("terminal") or cur.get("terminal"),
                "attempt": rec.get("attempt", cur.get("attempt", 0)),
                "actor": rec.get("actor"),
            })
            state[iid] = cur
        return state

    def transition(self, intent_id, from_state, to_state, actor, note="",
                   evidence_refs=(), identity_key=None, terminal=None,
                   attempt=None, extra=None):
        assert_legal_transition(from_state, to_state, LEGAL_TRANSITIONS)
        with _locked(self.path, "a+") as f:
            f.seek(0)
            lines = [line for line in f if line.strip()]
            prev_hash = (json.loads(lines[-1])["hash"] if lines
                         else GENESIS_PREV)
            seq = len(lines) + 1
            body = {
                "seq": seq,
                "at": self.clock(),
                "intent_id": intent_id,
                "from_state": from_state,
                "to_state": to_state,
                "actor": actor,
                "note": note,
                "evidence_refs": list(evidence_refs),
                "identity_key": identity_key,
                "terminal": terminal,
                "attempt": attempt,
                "extra": extra or {},
            }
            rec = dict(body)
            rec["prev_hash"] = prev_hash
            rec["hash"] = sha256_hex(prev_hash + canonical(body))
            f.write(canonical(rec) + "\n")
            f.flush()
            return rec

    def verify_chain(self):
        """Recompute the hash chain. Returns (ok, first_bad_seq)."""
        prev = GENESIS_PREV
        for rec in self._read_all():
            body = {k: v for k, v in rec.items()
                    if k not in ("prev_hash", "hash")}
            if rec.get("prev_hash") != prev:
                return False, rec.get("seq")
            if rec.get("hash") != sha256_hex(prev + canonical(body)):
                return False, rec.get("seq")
            prev = rec["hash"]
        return True, None


class BudgetLedger:
    """Atomic, restart-durable budget consumption. consume() is all-or-nothing
    under an exclusive lock: two workers racing the same ceiling cannot both
    succeed. The learner can never raise a ceiling through this path; ceilings
    come from the envelope only."""

    def __init__(self, path):
        self.path = path

    def _load(self, f):
        f.seek(0)
        raw = f.read().strip()
        return json.loads(raw) if raw else {"windows": {}}

    def consume(self, window, key, amount, ceiling):
        """Try to consume `amount` of `key` in `window` against `ceiling`.
        Returns (allowed, consumed_after)."""
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            w = data["windows"].setdefault(window, {})
            cur = w.get(key, 0)
            if cur + amount > ceiling:
                return False, cur
            w[key] = cur + amount
            f.seek(0)
            f.truncate()
            f.write(json.dumps(data, indent=1, sort_keys=True))
            f.flush()
            return True, cur + amount

    def consumed(self, window, key):
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            return data["windows"].get(window, {}).get(key, 0)


class LeaseStore:
    """Exclusive per-intent leases. Only the lease holder may dispatch the
    intent. An expired lease is reclaimable; a live lease held by another
    worker blocks a second dispatcher (two-worker adversarial case)."""

    def __init__(self, path, clock=utcnow):
        self.path = path
        self.clock = clock

    def _load(self, f):
        f.seek(0)
        raw = f.read().strip()
        return json.loads(raw) if raw else {"leases": {}}

    def _now(self):
        return datetime.fromisoformat(self.clock())

    def acquire(self, intent_id, owner, ttl_sec):
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            now = self._now()
            cur = data["leases"].get(intent_id)
            if cur:
                exp = datetime.fromisoformat(cur["expires_at"])
                if exp > now and cur["owner"] != owner:
                    return False
            data["leases"][intent_id] = {
                "owner": owner,
                "acquired_at": now.isoformat(),
                "expires_at": (now.timestamp() + ttl_sec),
            }
            data["leases"][intent_id]["expires_at"] = \
                datetime.fromtimestamp(now.timestamp() + ttl_sec,
                                       timezone.utc).isoformat()
            f.seek(0)
            f.truncate()
            f.write(json.dumps(data, indent=1, sort_keys=True))
            f.flush()
            return True

    def release(self, intent_id, owner):
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            cur = data["leases"].get(intent_id)
            if cur and cur["owner"] == owner:
                del data["leases"][intent_id]
                f.seek(0)
                f.truncate()
                f.write(json.dumps(data, indent=1, sort_keys=True))
                f.flush()
                return True
            return False

    def holder(self, intent_id):
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            cur = data["leases"].get(intent_id)
            if not cur:
                return None
            if datetime.fromisoformat(cur["expires_at"]) <= self._now():
                return None
            return cur["owner"]


class CircuitStore:
    """Circuit breakers scoped by (kind, name), e.g. ("action","x:like"),
    ("probe","x:probe:comments-likes"), ("adapter","x:xapi"),
    ("platform","x"), ("tenant","default").

    Semantics reproduce the x-probe precedent:
    consecutive timeouts >= threshold opens the scope; while OPEN, no probe
    and no execution, with a machine-readable reason; after
    half_open_cooldown_sec a single half-open trial is permitted; a success
    closes the circuit, a failure re-opens it.

    An operator_directive pin (machine-readable, e.g. "offline diagnostic
    first, no more live-budget burn") holds the scope OPEN regardless of
    cooldown: this is how the 2026-09-30 x-probe behavior is reproduced."""

    def __init__(self, path, clock=utcnow):
        self.path = path
        self.clock = clock

    def _load(self, f):
        f.seek(0)
        raw = f.read().strip()
        return json.loads(raw) if raw else {"scopes": {}}

    def _save(self, f, data):
        f.seek(0)
        f.truncate()
        f.write(json.dumps(data, indent=1, sort_keys=True))
        f.flush()

    def _blank(self, scope, policy):
        return {
            "scope": scope,
            "state": "CLOSED",
            "consecutive_failures": 0,
            "consecutive_timeouts": 0,
            "failure_threshold": policy.get("failure_threshold", 5),
            "timeout_threshold": policy.get("timeout_threshold", 3),
            "half_open_cooldown_sec": policy.get("half_open_cooldown_sec",
                                                6 * 3600),
            "opened_at": None,
            "half_open_at": None,
            "half_open_trial_inflight": False,
            "reason": None,
            "operator_directive": None,
        }

    def check(self, scope, policy, now=None):
        """Returns (allowed, reason). OPEN => (False, machine reason)."""
        now_s = (now or self.clock())
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            st = data["scopes"].get(scope)
            if st is None:
                st = self._blank(scope, policy)
                data["scopes"][scope] = st
                self._save(f, data)
            if st["state"] == "OPEN":
                if st.get("operator_directive"):
                    return (False,
                            "CIRCUIT_OPEN scope=%s operator_directive=%r "
                            "consecutive_timeouts=%d"
                            % (scope, st["operator_directive"],
                               st["consecutive_timeouts"]))
                opened = datetime.fromisoformat(st["opened_at"])
                now_dt = datetime.fromisoformat(now_s)
                if (now_dt - opened).total_seconds() >= \
                        st["half_open_cooldown_sec"]:
                    st["state"] = "HALF_OPEN"
                    st["half_open_at"] = now_s
                    st["half_open_trial_inflight"] = True
                    self._save(f, data)
                    return True, "HALF_OPEN trial permitted for scope=%s" % scope
                remaining = st["half_open_cooldown_sec"] - \
                    (now_dt - opened).total_seconds()
                why = ("CIRCUIT_OPEN scope=%s consecutive_timeouts=%d "
                       "(threshold %d); half-open in %ds"
                       % (scope, st["consecutive_timeouts"],
                          st["timeout_threshold"], int(remaining)))
                if st.get("reason"):
                    why += "; %s" % st["reason"]
                return False, why
            if st["state"] == "HALF_OPEN":
                if st.get("half_open_trial_inflight"):
                    return (False,
                            "HALF_OPEN trial already inflight for scope=%s"
                            % scope)
                st["half_open_trial_inflight"] = True
                self._save(f, data)
                return True, "HALF_OPEN trial permitted for scope=%s" % scope
            return True, "CLOSED scope=%s" % scope

    def _mut(self, scope, policy, fn, now=None):
        now_s = now or self.clock()
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            st = data["scopes"].get(scope) or self._blank(scope, policy)
            fn(st, now_s)
            data["scopes"][scope] = st
            self._save(f, data)
            return st

    def record_success(self, scope, policy, now=None):
        def _fn(st, now_s):
            st.update(state="CLOSED", consecutive_failures=0,
                      consecutive_timeouts=0, opened_at=None,
                      half_open_at=None, half_open_trial_inflight=False,
                      reason=None)
        return self._mut(scope, policy, _fn, now)

    def record_timeout(self, scope, policy, now=None):
        def _fn(st, now_s):
            st["consecutive_timeouts"] += 1
            st["consecutive_failures"] = 0
            if st["consecutive_timeouts"] >= st["timeout_threshold"]:
                st.update(state="OPEN", opened_at=now_s,
                          half_open_trial_inflight=False,
                          reason="consecutive_timeouts=%d >= threshold %d"
                          % (st["consecutive_timeouts"],
                             st["timeout_threshold"]))
        return self._mut(scope, policy, _fn, now)

    def record_failure(self, scope, policy, now=None):
        def _fn(st, now_s):
            st["consecutive_failures"] += 1
            st["consecutive_timeouts"] = 0
            if st["consecutive_failures"] >= st["failure_threshold"]:
                st.update(state="OPEN", opened_at=now_s,
                          half_open_trial_inflight=False,
                          reason="consecutive_failures=%d >= threshold %d"
                          % (st["consecutive_failures"],
                             st["failure_threshold"]))
        return self._mut(scope, policy, _fn, now)

    def record_rate_limited(self, scope, policy, now=None):
        """A 429 is a hard stop for the scope, never a signal to reroute.
        The scope opens immediately with a rate-limit reason."""

        def _fn(st, now_s):
            st.update(state="OPEN", opened_at=now_s,
                      half_open_trial_inflight=False,
                      reason="platform rate limit (429): hard stop for scope")
        return self._mut(scope, policy, _fn, now)

    def pin_operator_directive(self, scope, policy, directive, now=None):
        def _fn(st, now_s):
            st.update(state="OPEN", opened_at=now_s,
                      operator_directive=directive,
                      half_open_trial_inflight=False,
                      reason="operator directive pin: %s" % directive)
        return self._mut(scope, policy, _fn, now)

    def clear_operator_directive(self, scope, policy, now=None):
        def _fn(st, now_s):
            st["operator_directive"] = None
            st.update(state="CLOSED", consecutive_failures=0,
                      consecutive_timeouts=0, opened_at=None, reason=None)
        return self._mut(scope, policy, _fn, now)

    def state(self, scope):
        with _locked(self.path, "a+") as f:
            data = self._load(f)
            return data["scopes"].get(scope)


class RelationshipLedger:
    """Append-only relationship events (verified outcomes only). This is the
    operational projection; the canonical truth stays in the journal and
    outcome receipts."""

    def __init__(self, path, clock=utcnow):
        self.path = path
        self.clock = clock

    def append(self, entry):
        entry = dict(entry)
        entry["at"] = self.clock()
        with _locked(self.path, "a") as f:
            f.write(canonical(entry) + "\n")
            f.flush()

    def touch_count(self, identity_key, action, since_days=30):
        if not os.path.isfile(self.path):
            return 0
        now = datetime.fromisoformat(self.clock())
        n = 0
        with open(self.path) as f:
            for line in f:
                if not line.strip():
                    continue
                e = json.loads(line)
                if e.get("identity_key") == identity_key and \
                        e.get("action") == action:
                    at = datetime.fromisoformat(e["at"])
                    if (now - at).days < since_days:
                        n += 1
        return n
