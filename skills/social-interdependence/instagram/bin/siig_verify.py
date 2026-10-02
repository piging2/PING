#!/usr/bin/env python3
"""siig_verify.py: read-after-write verification and UNKNOWN recovery.

NO_CANONICAL_SUCCESS_WITHOUT_VERIFICATION: the adapter's "ok" is a claim.
Canonical success (VERIFIED_SUCCESS, which alone permits the guard-history
record and the relationship update) requires an independent read_state()
observation confirming the external effect.

UNKNOWN-outcome recovery (NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION):
an intent stranded in UNKNOWN resolves only through a verification read:
  read shows effect applied  -> VERIFIED_SUCCESS
  read proves effect absent  -> SAFE_RETRY (bounded; the read is the proof
                               the retry cannot duplicate)
  read itself fails          -> remain UNKNOWN (honest; reconcile retries
                               the read later, never the mutation)
"""
from siig_adapter_contract import (AdapterTimeout, AdapterOutage,
                                   AdapterAuthExpired, AdapterError)


def verify_after_attempt(intent, adapter, violations):
    """VERIFYING: confirm the claimed effect by independent read.
    Returns (new_state, evidence)."""
    action = intent["action"]
    try:
        state = adapter.read_state(intent["target_handle"], intent.get("target_post_url"))
    except (AdapterOutage, AdapterTimeout, AdapterError) as e:
        return "UNKNOWN", {"why": "verification read failed: %s" % e,
                           "read_attempted": True}
    except AdapterAuthExpired as e:
        return "FAILED_TERMINAL", {"why": "credential expired during "
                                   "verification: %s" % e}
    applied = state.get("liked") if action == "like" else state.get(
        "commented")
    signals = state.get("platform_signals") or []
    if applied:
        evidence = {
            "why": "read-after-write confirmed %s applied" % action,
            "read": {"liked": state.get("liked"),
                     "commented": state.get("commented")},
            "platform_signals": signals}
        if any(s in ("action_limited", "negative_feedback",
                     "action_block", "checkpoint", "warning")
               for s in signals):
            evidence["negative_feedback"] = True
        return "VERIFIED_SUCCESS", evidence
    violations.append({
        "kind": "adapter-truth-mismatch",
        "intent_id": intent["intent_id"],
        "detail": "adapter claimed ok; read_state shows effect absent",
    })
    return "FAILED_RETRYABLE", {
        "why": "verification read disproves the adapter's ok claim; "
               "bounded retry permitted, canonical success NOT recorded",
        "read": {"liked": state.get("liked"),
                 "commented": state.get("commented")}}


def resolve_unknown(intent, adapter):
    """UNKNOWN recovery by read. Returns (new_state, evidence).
    Never re-executes the mutation."""
    try:
        state = adapter.read_state(intent["target_handle"], intent.get("target_post_url"))
    except (AdapterOutage, AdapterTimeout, AdapterError) as e:
        return "UNKNOWN", {"why": "recovery read failed: %s" % e,
                           "mutation_not_retried": True}
    except AdapterAuthExpired as e:
        return "FAILED_TERMINAL", {"why": "credential expired: %s" % e}
    action = intent["action"]
    applied = state.get("liked") if action == "like" else state.get(
        "commented")
    signals = state.get("platform_signals") or []
    if applied:
        evidence = {
            "why": "recovery read found the effect applied; "
                   "no duplicate execution performed",
            "platform_signals": signals}
        if any(s in ("action_limited", "negative_feedback",
                     "action_block", "checkpoint", "warning")
               for s in signals):
            evidence["negative_feedback"] = True
        return "VERIFIED_SUCCESS", evidence
    return "SAFE_RETRY", {
        "why": "recovery read proves the effect absent; retry is safe "
               "because the read, not a guess, established non-application"}
