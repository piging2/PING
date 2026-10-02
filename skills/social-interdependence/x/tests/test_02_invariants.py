#!/usr/bin/env python3
"""Test 2: machine-enforced invariants fire exactly when they must, and stay
silent on the legal path."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import si_testlib as T
from x_invariants import (
    InvariantViolation, assert_authorized_account,
    assert_platform_action_allowed, assert_no_duplicate_active,
    assert_ok_boolean_present, assert_no_canonical_success_without_verification,
    assert_no_blind_retry, assert_circuit_allows,
    assert_learner_within_envelope, assert_adapter_has_no_decision_authority,
    assert_authority_clear, assert_legal_transition)
from x_store import LEGAL_TRANSITIONS

ENV = {"authorized_accounts": ["ping_social"],
       "allowed_platforms": ["x"],
       "allowed_action_types": ["like", "follow"],
       "allowed_capabilities": {"x": ["x.like", "x.follow"]},
       "learner_tunables": {"dispatch_spacing_sec": {"min": 60,
                                                     "max": 900}}}
INTENT = {"intent_id": "x:like:post:1:b1", "platform": "x", "action": "like",
          "authorized_account": "ping_social"}


def raises(name, fn):
    try:
        fn()
    except InvariantViolation as e:
        T.check(name, True)
        return
    T.check(name, False, "no InvariantViolation raised")


def silent(name, fn):
    try:
        fn()
    except InvariantViolation as e:
        T.check(name, False, str(e))
        return
    T.check(name, True)


silent("authorized account passes",
       lambda: assert_authorized_account(INTENT, ENV))
raises("unauthorized account raises",
       lambda: assert_authorized_account(
           dict(INTENT, authorized_account="mallory"), ENV))
silent("platform/action/capability allowed passes",
       lambda: assert_platform_action_allowed(INTENT, ENV))
raises("disallowed action raises",
       lambda: assert_platform_action_allowed(
           dict(INTENT, action="comment"), ENV))
raises("missing capability raises",
       lambda: assert_platform_action_allowed(
           INTENT, dict(ENV, allowed_capabilities={"x": ["x.follow"]})))

derived = {"x:like:post:1:old": {"identity_key": "x:like:post:1",
                                 "state": "SCHEDULED", "terminal": None}}
raises("duplicate active intent raises",
       lambda: assert_no_duplicate_active("x:like:post:1:new",
                                          "x:like:post:1", derived))
silent("terminal intent does not block re-dispatch check",
       lambda: assert_no_duplicate_active(
           "x:like:post:1:new", "x:like:post:1",
           {"x:like:post:1:old": {"identity_key": "x:like:post:1",
                                  "state": "VERIFIED_SUCCESS",
                                  "terminal": "VERIFIED_SUCCESS"}}))
silent("NOT_ATTEMPTED terminal stays eligible",
       lambda: assert_no_duplicate_active(
           "x:like:post:1:new", "x:like:post:1",
           {"x:like:post:1:old": {"identity_key": "x:like:post:1",
                                  "state": "FAILED_TERMINAL",
                                  "terminal": "NOT_ATTEMPTED"}}))

raises("outcome without ok raises",
       lambda: assert_ok_boolean_present({"intent_id": "i"}))
raises("outcome with non-boolean ok raises",
       lambda: assert_ok_boolean_present({"intent_id": "i", "ok": "yes"}))
silent("outcome with ok=True passes",
       lambda: assert_ok_boolean_present({"intent_id": "i", "ok": True}))

good_receipt = {"intent_id": "i", "ok": True, "canonical_success": True,
                "verification": {"method": "read-after-write",
                                 "observed_at": "2026-10-01T00:00:00+00:00"}}
silent("verified canonical success passes",
       lambda: assert_no_canonical_success_without_verification(good_receipt))
raises("canonical success with ok=False raises",
       lambda: assert_no_canonical_success_without_verification(
           dict(good_receipt, ok=False)))
raises("canonical success without verification evidence raises",
       lambda: assert_no_canonical_success_without_verification(
           {"intent_id": "i", "ok": True, "canonical_success": True,
            "verification": {}}))

raises("blind retry from UNKNOWN raises",
       lambda: assert_no_blind_retry("UNKNOWN", False))
raises("blind retry from ATTEMPTING raises",
       lambda: assert_no_blind_retry("ATTEMPTING", False))
silent("retry after verification read passes",
       lambda: assert_no_blind_retry("UNKNOWN", True))

raises("open circuit blocks execution",
       lambda: assert_circuit_allows("x:like", False, "CIRCUIT_OPEN test"))
silent("closed circuit allows",
       lambda: assert_circuit_allows("x:like", True, "CLOSED"))

raises("learner param outside [min,max] raises",
       lambda: assert_learner_within_envelope(
           {"params": {"dispatch_spacing_sec": 5000}}, ENV))
raises("learner inventing a param raises",
       lambda: assert_learner_within_envelope({"params": {"new_rule": 1}},
                                             ENV))
raises("learner touching constitutional authority raises",
       lambda: assert_learner_within_envelope(
           {"params": {"allowed_action_types": ["like"]}}, ENV))
raises("learner raising its ceiling raises",
       lambda: assert_learner_within_envelope(
           {"params": {"dispatch_spacing_sec": 120}, "raises_ceiling": True},
           ENV))
silent("in-envelope learner proposal passes",
       lambda: assert_learner_within_envelope(
           {"params": {"dispatch_spacing_sec": 120}}, ENV))

raises("adapter decision field raises",
       lambda: assert_adapter_has_no_decision_authority(
           {"ok": True, "chosen_target": "@someone"}))
silent("plain adapter result passes",
       lambda: assert_adapter_has_no_decision_authority({"ok": True}))

raises("denied authority raises",
       lambda: assert_authority_clear("DENIED"))
silent("authorized gate passes",
       lambda: assert_authority_clear("AUTHORIZED"))

raises("illegal transition raises",
       lambda: assert_legal_transition("DISCOVERED", "DISPATCHED",
                                       LEGAL_TRANSITIONS))
silent("legal transition passes",
       lambda: assert_legal_transition("ATTEMPTING", "UNKNOWN",
                                       LEGAL_TRANSITIONS))

sys.exit(T.summary())
