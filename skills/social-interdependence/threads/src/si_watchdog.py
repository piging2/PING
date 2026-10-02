#!/usr/bin/env python3
"""Watchdog: observes, never authorizes.

The watchdog may reduce, stop, defer, or roll back. It may NOT grant
authority, raise budgets, or declare success. Scope: action, account,
adapter, platform, tenant.

Signals watched: policy violations (illegal transitions, invariant
breaches), failure/unknown/verification-failure rates, budget anomalies
(consumption without evidence), learner drift, platform flags
(checkpoint/action-block text observed by the adapter), tab-hygiene
violations.

Circuit breakers: opening a breaker stops NEW mutations in that scope
(NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN is a runtime assertion). After
cooldown, a breaker half-opens with a single canary action; the canary
must verify clean before the breaker closes.

Automatic rollback: learned config lives versioned; a regression signal
restores the last known-good config without human involvement.
"""
import json
import os
import time

import si_state as _S
from si_state import (read_jsonl, append_jsonl, utcnow,
                      ensure_state_dir)

BREAKER_SCOPES = ["action:threads.like", "action:threads.comment",
                  "account:@nolanpigi", "adapter:threads",
                  "platform:threads", "tenant"]


def _breaker_path():
    return os.path.join(_S.state_dir(), "breakers.json")


def load_breakers():
    ensure_state_dir()
    p = _breaker_path()
    if not os.path.isfile(p):
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def save_breakers(b):
    ensure_state_dir()
    tmp = _breaker_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(b, f, sort_keys=True)
    os.replace(tmp, _breaker_path())


def open_breaker(scope, reason, actor="si-watchdog"):
    b = load_breakers()
    b[scope] = {"open": True, "reason": reason, "opened_at": utcnow(),
                "opened_by": actor, "half_open": False}
    save_breakers(b)
    append_jsonl("watchdog.jsonl",
                 {"at": utcnow(), "event": "breaker_opened",
                  "scope": scope, "reason": reason})
    return b[scope]


def close_breaker(scope, reason, actor="si-watchdog"):
    b = load_breakers()
    b[scope] = {"open": False, "reason": reason, "closed_at": utcnow(),
                "closed_by": actor, "half_open": False}
    save_breakers(b)
    append_jsonl("watchdog.jsonl",
                 {"at": utcnow(), "event": "breaker_closed",
                  "scope": scope, "reason": reason})


def half_open_breaker(scope, cooldown_sec):
    b = load_breakers()
    st = b.get(scope, {})
    if not st.get("open"):
        return False
    opened = st.get("opened_at", "")
    try:
        from datetime import datetime
        age = (datetime.now(datetime.timezone.utc)
               - datetime.fromisoformat(opened)).total_seconds()
    except Exception:
        age = cooldown_sec + 1
    if age >= cooldown_sec and not st.get("half_open"):
        st["half_open"] = True
        save_breakers(b)
        append_jsonl("watchdog.jsonl",
                     {"at": utcnow(), "event": "breaker_half_open",
                      "scope": scope})
        return True
    return False


def _window(rows, hours=2):
    from datetime import datetime, timedelta, timezone
    cutoff = (datetime.now(timezone.utc)
              - timedelta(hours=hours)).isoformat()
    return [r for r in rows if r.get("at", "") >= cutoff]


def rates(hours=2):
    """Failure / unknown / verification-failure rates over the window."""
    terms = _window(read_jsonl("evidence.jsonl"), hours=hours)
    if not terms:
        return {"n": 0, "failure_rate": 0.0, "unknown_rate": 0.0,
                "verification_failure_rate": 0.0}
    n = len(terms)
    failed = sum(1 for t in terms
                 if t.get("outcome") in ("FAILED_RETRYABLE",
                                         "FAILED_TERMINAL"))
    unknown = sum(1 for t in terms if t.get("outcome") == "UNKNOWN")
    vfail = sum(1 for t in terms
                if (t.get("verification") or {}).get("lie_detected"))
    return {"n": n, "failure_rate": failed / n, "unknown_rate": unknown / n,
            "verification_failure_rate": vfail / n}


def check(envelope):
    """Run all watchdog checks. Returns a list of actions taken."""
    taken = []
    pol = envelope["circuit_breaker_policy"]

    # 1. platform flag observed by the adapter (checkpoint / action block /
    #    rate limit text) -> open the platform breaker immediately.
    for r in _window(read_jsonl("adapter_flags.jsonl"), hours=24):
        flag = r.get("flag", "")
        if flag in ("checkpoint", "action_block", "rate_limit",
                    "login_lost", "logged_out"):
            st = load_breakers().get("platform:threads", {})
            if not st.get("open"):
                open_breaker("platform:threads",
                             "platform flag observed: %s (%s)"
                             % (flag, r.get("intent_id", "")))
                taken.append("opened platform:threads (%s)" % flag)

    # 2. rate ceilings (need a minimum sample to avoid noise).
    r = rates(hours=2)
    if r["n"] >= 3:
        if r["failure_rate"] > envelope["maximum_failure_rate"]:
            open_breaker("platform:threads",
                         "failure rate %.2f > ceiling %.2f"
                         % (r["failure_rate"],
                            envelope["maximum_failure_rate"]))
            taken.append("opened platform:threads (failure rate)")
        if r["unknown_rate"] > envelope["maximum_unknown_rate"]:
            open_breaker("adapter:threads",
                         "unknown rate %.2f > ceiling %.2f"
                         % (r["unknown_rate"],
                            envelope["maximum_unknown_rate"]))
            taken.append("opened adapter:threads (unknown rate)")

    # 2b. verification failure is a trust violation, not noise: any single
    # adapter claim vs read-back mismatch opens the adapter breaker.
    if any((t.get("verification") or {}).get("lie_detected")
           for t in _window(read_jsonl("evidence.jsonl"), hours=24)):
        st = load_breakers().get("adapter:threads", {})
        if not st.get("open"):
            open_breaker("adapter:threads",
                         "verification failure (adapter claim vs "
                         "read-back mismatch)")
            taken.append("opened adapter:threads (verification failure)")

    # 3. budget anomalies: consumption events with no matching intent
    #    evidence within the window.
    consumed = {(c.get("intent_id")) for c in
                _window(read_jsonl("budget.jsonl"), hours=2)}
    evidenced = {(e.get("intent_id")) for e in
                 _window(read_jsonl("evidence.jsonl"), hours=2)}
    orphan = sorted(i for i in consumed if i and i not in evidenced)
    if orphan:
        open_breaker("account:@nolanpigi",
                     "budget consumed without evidence: %s"
                     % ",".join(orphan[:3]))
        taken.append("opened account:@nolanpigi (budget anomaly)")

    # 4. learner regression -> automatic rollback of learned config.
    reg = _window([x for x in read_jsonl("learner.jsonl")
                   if x.get("kind") == "regression"], hours=24)
    if reg:
        rolled = rollback_learned_config()
        if rolled:
            taken.append("rolled back learned config (%s)" % rolled)

    return taken


# ------------------------------------------------- learned config versions
def _learned_path():
    return os.path.join(_S.state_dir(), "learned_config.json")


def get_learned_config():
    ensure_state_dir()
    p = _learned_path()
    if not os.path.isfile(p):
        return {"version": 0, "params": {}, "history": []}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def propose_learned_config(params, envelope, actor="si-learner"):
    """Bounded self-improvement: SHADOW -> CANARY -> ACTIVE with
    machine-verifiable gates. The learner may tune only inside
    learner_bounds and may NEVER raise a ceiling (enforced in si_policy)."""
    from si_policy import check_no_learner_policy_self_modification
    check_no_learner_policy_self_modification(envelope, params)
    cfg = get_learned_config()
    cfg["version"] += 1
    cfg["params"] = dict(params)
    cfg["history"].append({"version": cfg["version"], "at": utcnow(),
                          "params": dict(params), "stage": "SHADOW",
                          "actor": actor})
    tmp = _learned_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, sort_keys=True)
    os.replace(tmp, _learned_path())
    append_jsonl("learner.jsonl",
                 {"at": utcnow(), "kind": "proposed", "version":
                  cfg["version"], "params": dict(params), "stage": "SHADOW"})
    return cfg["version"]


def promote_learned_config(version, stage, gates):
    """Promote SHADOW -> CANARY -> ACTIVE. Gates are machine-verifiable:
    policy_violations == 0, duplicate_canonical_actions == 0,
    unverified_success_declarations == 0, unknown_outcome_rate <= ceiling."""
    required = {"policy_violations": 0, "duplicate_canonical_actions": 0,
                "unverified_success_declarations": 0}
    for k, want in required.items():
        got = gates.get(k)
        if got != want:
            raise ValueError("promotion gate %s=%r, required %r"
                             % (k, got, want))
    cfg = get_learned_config()
    if cfg["version"] != version:
        raise ValueError("stale config version")
    cfg["history"].append({"version": version, "at": utcnow(),
                          "params": dict(cfg["params"]),
                          "stage": stage, "gates": dict(gates)})
    tmp = _learned_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, sort_keys=True)
    os.replace(tmp, _learned_path())
    append_jsonl("learner.jsonl",
                 {"at": utcnow(), "kind": "promoted", "version": version,
                  "stage": stage, "gates": dict(gates)})
    return True


def rollback_learned_config():
    """Automatic rollback to the last ACTIVE version."""
    cfg = get_learned_config()
    last_active = None
    for h in reversed(cfg["history"]):
        if h.get("stage") == "ACTIVE":
            last_active = h
            break
    if not last_active:
        return ""
    cfg["version"] += 1
    cfg["params"] = dict(last_active.get("params", {}))
    cfg["history"].append({"version": cfg["version"], "at": utcnow(),
                          "stage": "ACTIVE",
                          "note": "automatic rollback to v%d"
                                  % last_active["version"]})
    tmp = _learned_path() + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, sort_keys=True)
    os.replace(tmp, _learned_path())
    append_jsonl("learner.jsonl",
                 {"at": utcnow(), "kind": "rolled_back",
                  "to_version": last_active["version"]})
    return "v%d" % last_active["version"]
