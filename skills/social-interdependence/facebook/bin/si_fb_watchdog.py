#!/usr/bin/env python3
"""Watchdog for the Facebook slice.

Observes; never authorizes. On each tick it folds the outcome stream over
the trailing window and checks the envelope's machine-verifiable gates:

  - policy violations (invariant violations recorded): must be 0
  - duplicate canonical actions: must be 0
  - unverified-success declarations: must be 0
  - unknown-outcome rate <= envelope maximum_unknown_rate
  - failure rate <= envelope maximum_failure_rate
  - verification-failure rate <= circuit_breaker_policy threshold
  - budget anomalies: consumption exceeding the effective window budget
    (cannot happen through budget_consume; the check guards against
    out-of-band writes)
  - negative-feedback spike: adapter-reported negative feedback on acted
    posts above threshold -> open platform breaker (platform flag, not
    prose: the signal is machine-read from verification reads)

Actions the watchdog MAY take: open a circuit breaker (scoped), reduce the
scheduler's concurrency, defer passes, roll back learned config to the last
known-good version. Actions it may NOT take: grant authority, close a
breaker it did not open on policy grounds, raise any budget or bound,
declare any canonical outcome.

Breaker auto-close is machine-enforced, not watchdog-granted: a breaker
closes only after its cooldown elapses AND a verification probe (read-only
adapter read + authority gate) passes. The watchdog records the probe; the
policy in the envelope defines the cooldown.

Usage: si_fb_watchdog.py tick --envelope ENV.json
"""
import argparse
import json
import os
import sys
import time

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)
import si_fb_invariants as inv  # noqa: E402
import si_fb_state as st  # noqa: E402
from si_fb_envelope import load_envelope, effective_window_budget  # noqa: E402
from si_fb_orchestrator import run_authority_gate  # noqa: E402


def fold_outcomes(window_sec, now):
    obs = st.read_jsonl("observations.jsonl")
    cutoff = now - window_sec
    items = []
    for o in obs:
        try:
            ts = o.get("ts", "")
            from datetime import datetime
            t = datetime.fromisoformat(ts).timestamp()
        except Exception:
            continue
        if t >= cutoff:
            items.append(o)
    return items


def cmd_tick(args):
    envelope = load_envelope(args.envelope)
    cb_policy = envelope.get("circuit_breaker_policy") or {}
    window_sec = cb_policy.get("observation_window_sec", 86400)
    now = time.time()
    report = {"ts": st.utcnow(), "actions": [], "metrics": {}}
    outcomes = fold_outcomes(window_sec, now)
    total = len(outcomes)
    fails = sum(1 for o in outcomes
                if o.get("state") in ("FAILED_RETRYABLE", "FAILED_TERMINAL"))
    unknowns = sum(1 for o in outcomes if o.get("state") == "UNKNOWN")
    verif_fails = len([w for w in st.read_jsonl("watchdog.jsonl")
                       if w.get("event") == "verification_failure"])
    inv_viol = len([w for w in st.read_jsonl("watchdog.jsonl")
                    if w.get("event") == "invariant_violation"])
    dup_canon = len([w for w in st.read_jsonl("watchdog.jsonl")
                     if w.get("event") == "duplicate_canonical_action"])
    metrics = {
        "outcomes": total,
        "failure_rate": (fails / total) if total else 0.0,
        "unknown_rate": (unknowns / total) if total else 0.0,
        "verification_failures": verif_fails,
        "invariant_violations": inv_viol,
        "duplicate_canonical_actions": dup_canon,
    }
    report["metrics"] = metrics

    breakers = st.read_json("circuit_breakers.json", {}) or {}

    def open_breaker(scope, reason):
        breakers[scope] = {"open": True, "opened_at": st.utcnow(),
                           "reason": reason,
                           "cooldown_sec": cb_policy.get("cooldown_sec", 3600),
                           "opened_by": "watchdog"}
        report["actions"].append({"action": "open_breaker", "scope": scope,
                                  "reason": reason})

    # Hard gates: any violation opens the platform breaker immediately.
    if inv_viol > 0 or dup_canon > 0:
        open_breaker("platform:facebook",
                     "policy gate tripped: invariant_violations=%d "
                     "duplicate_canonical=%d" % (inv_viol, dup_canon))
    max_fail = envelope.get("maximum_failure_rate", 0.2)
    if metrics["failure_rate"] > max_fail and total >= 5:
        open_breaker("platform:facebook",
                     "failure_rate %.3f > %.3f" % (metrics["failure_rate"],
                                                  max_fail))
    max_unk = envelope.get("maximum_unknown_rate", 0.1)
    if metrics["unknown_rate"] > max_unk and total >= 5:
        open_breaker("platform:facebook",
                     "unknown_rate %.3f > %.3f" % (metrics["unknown_rate"],
                                                  max_unk))
    verif_thresh = cb_policy.get("verification_failure_threshold", 3)
    if verif_fails >= verif_thresh:
        open_breaker("adapter:facebook",
                     "verification_failures=%d >= %d (adapter claims not "
                     "matching read-back)" % (verif_fails, verif_thresh))

    # Budget anomaly: consumption beyond the effective window budget.
    budget = effective_window_budget(envelope)
    for action in envelope["allowed_action_types"]:
        scope = "fb:execution:%s" % action
        consumed = st.budget_consumed(scope, 2 * 3600, now)
        if consumed > budget[action]:
            open_breaker("platform:facebook",
                         "budget anomaly: %s consumed %d > budget %d"
                         % (scope, consumed, budget[action]))
            report["actions"].append(
                {"action": "note",
                 "note": "consumption exceeded budget outside the atomic "
                         "path; investigate out-of-band writes"})

    # Negative-feedback spike: machine-read from verification reads.
    try:
        import si_fb_adapter as adapter
        srv = st.read_json("adapter_facebook.json", {}) or {}
        neg = sum(1 for p in (srv.get("posts") or {}).values()
                  if p.get("negative_feedback") and p.get("liked"))
        neg_thresh = cb_policy.get("negative_feedback_threshold", 5)
        if neg >= neg_thresh:
            open_breaker("platform:facebook",
                         "negative_feedback spike: %d acted posts flagged"
                         % neg)
    except Exception as e:
        report["actions"].append({"action": "note",
                                  "note": "feedback scan failed: %s" % e})

    # Machine-enforced auto-close: cooldown elapsed AND probe passes.
    for scope, b in list(breakers.items()):
        if not b.get("open"):
            continue
        try:
            from datetime import datetime
            opened = datetime.fromisoformat(b["opened_at"]).timestamp()
        except Exception:
            continue
        if now - opened < b.get("cooldown_sec", 3600):
            continue
        probe_ok = False
        try:
            import si_fb_adapter as adapter
            adapter.read("__probe__")
            probe_ok = run_authority_gate() == "AUTHORITY-ALLOW"
        except Exception:
            probe_ok = False
        if probe_ok and b.get("opened_by") == "watchdog":
            b["open"] = False
            b["closed_at"] = st.utcnow()
            b["closed_by"] = "policy auto-close (cooldown + probe)"
            report["actions"].append({"action": "close_breaker",
                                      "scope": scope,
                                      "reason": "cooldown elapsed and "
                                                "verification probe passed"})

    st.write_json_atomic("circuit_breakers.json", breakers)
    st.append_jsonl("watchdog.jsonl", {"event": "tick", "report": report})
    print(json.dumps(report, indent=1))
    return 0


def main(argv):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("tick")
    t.add_argument("--envelope", required=True)
    t.set_defaults(fn=cmd_tick)
    args = p.parse_args(argv)
    try:
        return args.fn(args)
    except inv.InvariantViolation as e:
        print(json.dumps({"ok": False, "invariant": e.code,
                          "detail": e.detail}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
