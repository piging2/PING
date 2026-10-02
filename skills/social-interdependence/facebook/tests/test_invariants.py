#!/usr/bin/env python3
"""Invariant unit tests: each machine-enforced invariant in
si_fb_invariants.py is exercised directly : the legal case passes, the
violation raises InvariantViolation with the stable code.

These are the runtime assertions that replace per-action human approval.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin")
sys.path.insert(0, BIN)
import si_fb_invariants as inv

RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def raises(code, fn, *args):
    try:
        fn(*args)
        return None
    except inv.InvariantViolation as e:
        return e.code


def main():
    env = {"authorized_accounts": ["ping.social.page"],
           "learner": {"bounds": {"batch_size": [1, 20]}}}

    # NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT
    inv.assert_authorized_account("ping.social.page", env, "AUTHORITY-ALLOW")
    check("authorized_account_passes", True)
    check("unauthorized_account_refused",
          raises("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
                 inv.assert_authorized_account, "evil.page", env,
                 "AUTHORITY-ALLOW") == "NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT")
    check("authority_deny_refused",
          raises("NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT",
                 inv.assert_authorized_account, "ping.social.page", env,
                 "AUTHORITY-DENY") == "NO_ACTION_WITHOUT_AUTHORIZED_ACCOUNT")

    # NO_DUPLICATE_ACTIVE_INTENT (per intent_id)
    fold = {"facebook:like:post:1:b1": {"state": "DISPATCHED",
                                        "record": {"target_ref": "post:1"}},
            "facebook:like:post:2:b1": {"state": "VERIFIED_SUCCESS",
                                        "record": {"target_ref": "post:2"}},
            "facebook:like:post:3:b1": {"state": "SAFE_RETRY",
                                        "record": {"target_ref": "post:3"}}}
    check("duplicate_active_refused",
          raises("NO_DUPLICATE_ACTIVE_INTENT",
                 inv.assert_no_duplicate_active,
                 "facebook:like:post:1:b1", fold)
          == "NO_DUPLICATE_ACTIVE_INTENT")
    inv.assert_no_duplicate_active("facebook:like:post:2:b1", fold)
    check("duplicate_terminal_allowed", True)
    inv.assert_no_duplicate_active("facebook:like:post:9:b9", fold)
    check("duplicate_absent_allowed", True)

    # Per-target in-flight protection (cross-batch).
    check("target_in_flight_found",
          inv.target_in_flight(fold, "post:1") == "facebook:like:post:1:b1")
    check("target_terminal_not_in_flight",
          inv.target_in_flight(fold, "post:2") is None)
    check("target_safe_retry_not_in_flight",
          inv.target_in_flight(fold, "post:3") is None)
    check("target_absent_not_in_flight",
          inv.target_in_flight(fold, "post:9") is None)

    # NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION
    good = {"method": "read_after_write", "observed_effect": True,
            "observer": "orchestrator"}
    inv.assert_verified_success(good)
    check("verified_success_passes", True)
    for bad, name in [
            ({"method": "read_after_write", "observed_effect": False,
              "observer": "orchestrator"}, "effect_false"),
            ({"method": "adapter_claim", "observed_effect": True,
              "observer": "orchestrator"}, "adapter_claim"),
            ({"method": "read_after_write", "observed_effect": True,
              "observer": "adapter"}, "adapter_observer"),
            ({}, "empty")]:
        check("verification_%s_refused" % name,
              raises("NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION",
                     inv.assert_verified_success, bad)
              == "NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION")

    # NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN
    inv.assert_breaker_closed("action:facebook:like", {})
    check("breaker_closed_passes", True)
    check("breaker_open_refused",
          raises("NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN",
                 inv.assert_breaker_closed, "action:facebook:like",
                 {"action:facebook:like": {"open": True,
                                           "reason": "test"}})
          == "NO_EXECUTION_AFTER_CIRCUIT_BREAKER_OPEN")

    # NO_MUTATION_WHEN_SAFE_MODE
    healthy = {"identity": True, "policy": True, "capability": True,
               "event_persistence": True, "verification": True}
    inv.assert_safe_to_mutate(healthy)
    check("healthy_passes", True)
    degraded = dict(healthy, verification=False)
    check("degraded_refused",
          raises("NO_MUTATION_WHEN_SAFE_MODE",
                 inv.assert_safe_to_mutate, degraded)
          == "NO_MUTATION_WHEN_SAFE_MODE")

    # NO_LEARNER_POLICY_SELF_MODIFICATION
    inv.assert_learner_within_bounds({"batch_size": 10}, env)
    check("learner_in_bounds_passes", True)
    check("learner_out_of_bounds_refused",
          raises("NO_LEARNER_POLICY_SELF_MODIFICATION",
                 inv.assert_learner_within_bounds, {"batch_size": 21}, env)
          == "NO_LEARNER_POLICY_SELF_MODIFICATION")
    check("learner_untracked_param_refused",
          raises("NO_LEARNER_POLICY_SELF_MODIFICATION",
                 inv.assert_learner_within_bounds,
                 {"new_param": 1}, env)
          == "NO_LEARNER_POLICY_SELF_MODIFICATION")

    # NO_ADAPTER_DECISION_AUTHORITY
    inv.assert_adapter_evidence_shape({"attempted": True,
                                       "external_mutation_made": True,
                                       "observed": {}, "note": "x"})
    check("raw_evidence_passes", True)
    check("adapter_canonical_claim_refused",
          raises("NO_ADAPTER_DECISION_AUTHORITY",
                 inv.assert_adapter_evidence_shape,
                 {"attempted": True, "canonical": "VERIFIED_SUCCESS"})
          == "NO_ADAPTER_DECISION_AUTHORITY")

    # Intent id contract.
    inv.assert_intent_id("facebook:like:post:123:b1")
    inv.assert_intent_id("facebook:comment:post:pfbidAbC123:b-2")
    check("intent_id_contract_passes", True)
    check("intent_id_malformed_refused",
          raises("NO_DUPLICATE_ACTIVE_INTENT", inv.assert_intent_id,
                 "facebook:share:post:123:b1") is not None)

    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
