#!/usr/bin/env python3
"""Autonomous scheduler for the Facebook slice.

Decides whether a new 2h pass may start, with no human in the loop. A pass
starts only when ALL of these hold:
  1. authority-check.py facebook -> AUTHORITY-ALLOW
  2. envelope validates
  3. cadence: >= 2h since the last started pass (temporal_constraints)
  4. no pass lease currently held (one fb-profile driver at a time)
  5. platform/action/account/tenant circuit breakers closed
  6. execution budget headroom for at least one action in the window
  7. safe-mode dependencies all available (else: reads continue, no pass)

Scheduling variation (jitter within the cadence window) exists for
operational reasons only (queue depth, cooldowns, backpressure). It is
never randomness for detection evasion: the envelope's temporal
constraints bound it, and the variation source and bounds are recorded
in the pass decision record.

Usage: si_fb_scheduler.py tick --envelope ENV.json
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
from si_fb_orchestrator import run_authority_gate, health_check  # noqa: E402


def cmd_tick(args):
    envelope = load_envelope(args.envelope)
    tc = envelope.get("temporal_constraints") or {}
    cadence_sec = tc.get("min_seconds_between_passes", 7200)
    now = time.time()
    decision = {"ts": st.utcnow(), "pass_started": False, "checks": {}}

    verdict = run_authority_gate()
    decision["checks"]["authority"] = verdict
    if verdict != "AUTHORITY-ALLOW":
        decision["reason"] = "authority gate did not allow"
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    health = health_check(envelope)
    decision["checks"]["health"] = health
    if not all(health.values()):
        decision["reason"] = ("safe mode: dependency unavailable; reads "
                              "continue, new passes stop")
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    last = st.read_json("last_pass.json", {}) or {}
    age = now - last.get("started_at", 0)
    decision["checks"]["cadence_age_sec"] = age
    if age < cadence_sec:
        decision["reason"] = "cadence: %.0fs since last pass, need %ds" % (
            age, cadence_sec)
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    holder = st.lease_holder("fb:pass", now)
    decision["checks"]["pass_lease_holder"] = holder
    if holder:
        decision["reason"] = "pass lease held by %s" % holder
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    breakers = st.read_json("circuit_breakers.json", {}) or {}
    open_scopes = [s for s, b in breakers.items() if b.get("open")]
    decision["checks"]["open_breakers"] = open_scopes
    if open_scopes:
        decision["reason"] = "circuit breaker open: %s" % open_scopes
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    budget = effective_window_budget(envelope)
    headroom = {a: budget[a] - st.budget_consumed("fb:execution:%s" % a,
                                                  2 * 3600, now)
                for a in envelope["allowed_action_types"]}
    decision["checks"]["budget_headroom"] = headroom
    if not any(v > 0 for v in headroom.values()):
        decision["reason"] = "no execution budget headroom in this window"
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0

    batch_id = "fb-%d" % int(now)
    if not st.lease_acquire("fb:pass", batch_id, cadence_sec):
        decision["reason"] = "pass lease race lost"
        st.append_jsonl("scheduler.jsonl", decision)
        print(json.dumps(decision, indent=1))
        return 0
    st.write_json_atomic("last_pass.json", {"started_at": now,
                                            "batch_id": batch_id})
    decision["pass_started"] = True
    decision["batch_id"] = batch_id
    decision["reason"] = "all gates pass"
    st.append_jsonl("scheduler.jsonl", decision)
    print(json.dumps(decision, indent=1))
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
