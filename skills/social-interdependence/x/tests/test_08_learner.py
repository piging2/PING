#!/usr/bin/env python3
"""Test 8: the bounded learner. Promotion SHADOW -> CANARY -> ACTIVE
requires machine-verifiable gates; a regression against the ACTIVE
baseline triggers automatic rollback; out-of-envelope and authority-grab
proposals are refused."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_watchdog import BoundedLearner
from x_invariants import InvariantViolation
from x_orchestrator import load_envelope

T.make_outreach_root()
GOOD_REPORT = {"policy_violations": 0, "duplicate_canonical_actions": 0,
               "verification_failures": 0, "unknown_rate": 0.02,
               "failure_rate": 0.01}

# 1. In-envelope proposal enters SHADOW.
scratch = T.make_scratch()
learner = BoundedLearner(scratch, load_envelope(T.write_envelope(scratch)))
p = learner.propose({"dispatch_spacing_sec": 90})
T.check("in-envelope proposal accepted at SHADOW",
        p["stage"] == "SHADOW" and
        p["params"]["dispatch_spacing_sec"] == 90, p)

# 2. Promotion SHADOW -> CANARY -> ACTIVE on clean reports.
p = learner.promote(0, GOOD_REPORT)
T.check("promotion to CANARY on passing gates", p["stage"] == "CANARY", p)
p = learner.promote(0, GOOD_REPORT)
T.check("promotion to ACTIVE on passing gates, baseline captured",
        p["stage"] == "ACTIVE" and p["baseline"]["unknown_rate"] == 0.02,
        p)
data = learner._load()
T.check("ACTIVE params become the live config",
        data["active"] == {"dispatch_spacing_sec": 90}, data["active"])

# 3. Regression vs the ACTIVE baseline triggers automatic rollback.
bad = dict(GOOD_REPORT, unknown_rate=0.05)
rolled = learner.check_regression(bad)
T.check("regression triggers automatic rollback",
        rolled is not None and rolled["stage"] == "ROLLED_BACK" and
        learner._load()["active"] == {}, rolled)
T.check("no regression: nothing rolled back",
        learner.check_regression(GOOD_REPORT) is None, None)

# 4. Promotion gate fails closed: a dirty report blocks promotion.
scratch2 = T.make_scratch()
learner2 = BoundedLearner(scratch2,
                          load_envelope(T.write_envelope(scratch2)))
learner2.propose({"dispatch_spacing_sec": 120})
dirty = dict(GOOD_REPORT, policy_violations=1)
try:
    learner2.promote(0, dirty)
    T.check("dirty report blocks promotion", False, "no raise")
except InvariantViolation as e:
    T.check("dirty report blocks promotion",
            "LEARNER_PROMOTION_GATE_FAILED" in str(e), str(e))
T.check("blocked proposal stays SHADOW",
        learner2._load()["proposals"][0]["stage"] == "SHADOW",
        learner2._load()["proposals"][0]["stage"])

# 5. Out-of-envelope params refused; ceiling-raises refused.
for params, name in [
        ({"dispatch_spacing_sec": 5000}, "out-of-envelope value"),
        ({"engagement_budget": {"x:like": 5000}}, "ceiling raise"),
        ({"authorized_accounts": ["mallory"]}, "authority grab"),
        ({"allowed_platforms": ["x", "y"]}, "platform grab"),
]:
    try:
        learner2.propose(params)
        T.check("learner refuses %s" % name, False, "no raise")
    except InvariantViolation:
        T.check("learner refuses %s" % name, True)

# 6. A proposal that reaches ACTIVE cannot be promoted again.
scratch3 = T.make_scratch()
learner3 = BoundedLearner(scratch3,
                          load_envelope(T.write_envelope(scratch3)))
learner3.propose({"dispatch_spacing_sec": 60})
learner3.promote(0, GOOD_REPORT)
learner3.promote(0, GOOD_REPORT)
try:
    learner3.promote(0, GOOD_REPORT)
    T.check("double-ACTIVE promotion refused", False, "no raise")
except InvariantViolation as e:
    T.check("double-ACTIVE promotion refused",
            "LEARNER_ALREADY_ACTIVE" in str(e), str(e))

sys.exit(T.summary())
