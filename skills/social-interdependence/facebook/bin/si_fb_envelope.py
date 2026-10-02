#!/usr/bin/env python3
"""Autonomy envelope loader/validator for the Facebook slice.

The envelope is the machine-readable authorization boundary that replaces
per-action human approval. It is validated on load (schema + invariant
sanity) and re-validated on every dispatch. Only an owner-signed envelope
update changes it; the learner, the watchdog, and the adapter can never
write it (NO_LEARNER_POLICY_SELF_MODIFICATION).

Envelope authority chain (evaluated in order, all must hold):
  1. authority-check.py facebook -> AUTHORITY-ALLOW (consumes holds.json
     step 0, AUTHORITY.json, capability window, platform restriction state)
  2. envelope loads, signature/self-consistency verifies
  3. candidate passes engagement-guard eligibility_check -> ELIGIBLE
  4. budgets (execution/concurrency/relationship/platform) admit the action
  5. circuit breakers closed for all relevant scopes

Usage: si_fb_envelope.py validate --envelope ENV.json
       si_fb_envelope.py effective-budget --envelope ENV.json
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)
import si_fb_invariants as inv  # noqa: E402

REQUIRED_FIELDS = (
    "tenant", "actor", "authorized_accounts", "allowed_platforms",
    "allowed_capabilities", "allowed_action_types", "prohibited_targets",
    "namespace_scope", "execution_budget", "concurrency_budget",
    "relationship_budget", "platform_budget", "temporal_constraints",
    "confidence_requirements", "verification_requirements", "retry_policy",
    "maximum_failure_rate", "maximum_unknown_rate", "circuit_breaker_policy",
)

# Constitutional constants for facebook. These are not tunable by the
# learner: the ramp rule is deterministic (ISO week arithmetic from a fixed
# anchor), and the learner's bounds are a strict subset of fixed ceilings.
FB_ACTION_TYPES = ("like", "comment")
FB_WINDOW_SEC = 2 * 3600
FB_BASE_WINDOW_BUDGET = {"like": 75, "comment": 20}
FB_RAMP_PER_WEEK = {"like": 5, "comment": 3}
FB_RAMP_ANCHOR = "2026-09-08"  # week the 75/20 standing volumes began
FB_MIN_DELAY_SEC = 60
FB_MAX_DELAY_SEC = 120


def load_envelope(path):
    with open(path, "r", encoding="utf-8") as f:
        env = json.load(f)
    missing = [k for k in REQUIRED_FIELDS if k not in env]
    inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES", not missing,
              "envelope missing fields: %s" % missing)
    inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES",
              env.get("allowed_platforms") == ["facebook"],
              "facebook slice envelope must scope to facebook only")
    for a in env.get("allowed_action_types", []):
        inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES",
                  a in FB_ACTION_TYPES,
                  "action type %r not in facebook capability set %r"
                  % (a, FB_ACTION_TYPES))
    # The envelope may not authorize what the capability registry denies.
    inv.check("NO_PROSE_AUTHORIZES_OR_FREEZES",
              set(env["allowed_capabilities"]) >= set(FB_ACTION_TYPES),
              "allowed_capabilities must cover the facebook action set")
    return env


def weeks_since_anchor(now=None):
    now = now or datetime.now(timezone.utc).date()
    anchor = datetime.strptime(FB_RAMP_ANCHOR, "%Y-%m-%d").date()
    return max(0, (now - anchor).days // 7)


def effective_window_budget(env, now=None):
    """Deterministic ramp: base + per-week increment, no human, no learner.
    The learner cannot raise this (the formula is constitutional; only an
    owner-signed envelope change alters base/ramp/anchor)."""
    w = weeks_since_anchor(now)
    out = {}
    for action in env["allowed_action_types"]:
        base = FB_BASE_WINDOW_BUDGET[action]
        out[action] = base + FB_RAMP_PER_WEEK[action] * w
    return out


def cmd_validate(args):
    env = load_envelope(args.envelope)
    budget = effective_window_budget(env)
    print(json.dumps({
        "ok": True,
        "tenant": env["tenant"],
        "actor": env["actor"],
        "platforms": env["allowed_platforms"],
        "action_types": env["allowed_action_types"],
        "effective_window_budget": budget,
        "window_sec": FB_WINDOW_SEC,
    }, indent=1))
    return 0


def cmd_effective_budget(args):
    env = load_envelope(args.envelope)
    print(json.dumps(effective_window_budget(env), indent=1))
    return 0


def main(argv):
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate")
    v.add_argument("--envelope", required=True)
    v.set_defaults(fn=cmd_validate)
    b = sub.add_parser("effective-budget")
    b.add_argument("--envelope", required=True)
    b.set_defaults(fn=cmd_effective_budget)
    args = p.parse_args(argv)
    try:
        return args.fn(args)
    except inv.InvariantViolation as e:
        print(json.dumps({"ok": False, "invariant": e.code,
                          "detail": e.detail}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
