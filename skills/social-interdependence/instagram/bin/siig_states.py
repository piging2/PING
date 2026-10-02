#!/usr/bin/env python3
"""siig_states.py: the Instagram intent state machine.

States are the cross-platform contract set, exactly:
DISCOVERED, NORMALIZED, EVALUATED, ELIGIBLE, REJECTED, INTENT_CREATED,
QUEUED, SCHEDULED, DISPATCHED, ATTEMPTING, UNKNOWN, VERIFYING,
VERIFIED_SUCCESS, VERIFIED_NOOP, SAFE_RETRY, DEFERRED, FAILED_RETRYABLE,
FAILED_TERMINAL, CANCELLED.

Replay is DECISION replay, never mutation replay: every transition appends
a persisted transition-evidence record (transitions.jsonl) carrying from,
to, timestamp, reason, and a sha256 of the evidence body. Current state is
rebuilt by replaying the transition log; there is no mutable intent row to
corrupt. A kill between transitions can only strand an intent in its last
persisted state, which reconcile() recovers without re-executing.
"""
import os

from siig_common import (
    STATE_ROOT, append_jsonl, read_jsonl, iso_now, sha256_text,
)

STATES = (
    "DISCOVERED", "NORMALIZED", "EVALUATED", "ELIGIBLE", "REJECTED",
    "INTENT_CREATED", "QUEUED", "SCHEDULED", "DISPATCHED", "ATTEMPTING",
    "UNKNOWN", "VERIFYING", "VERIFIED_SUCCESS", "VERIFIED_NOOP",
    "SAFE_RETRY", "DEFERRED", "FAILED_RETRYABLE", "FAILED_TERMINAL",
    "CANCELLED",
)

# Legal transitions. Anything not listed here is a machine-enforced refusal.
TRANSITIONS = {
    "DISCOVERED": {"NORMALIZED", "REJECTED"},
    "NORMALIZED": {"EVALUATED", "REJECTED"},
    "EVALUATED": {"ELIGIBLE", "REJECTED"},
    "ELIGIBLE": {"INTENT_CREATED", "REJECTED", "DEFERRED"},
    "INTENT_CREATED": {"QUEUED", "CANCELLED"},
    "QUEUED": {"SCHEDULED", "CANCELLED", "DEFERRED"},
    "SCHEDULED": {"DISPATCHED", "CANCELLED", "DEFERRED"},
    "DISPATCHED": {"ATTEMPTING", "SCHEDULED", "CANCELLED"},
    "ATTEMPTING": {"VERIFYING", "UNKNOWN", "FAILED_RETRYABLE",
                   "FAILED_TERMINAL", "CANCELLED"},
    "UNKNOWN": {"VERIFYING", "SAFE_RETRY", "FAILED_RETRYABLE",
                "FAILED_TERMINAL", "VERIFIED_SUCCESS", "VERIFIED_NOOP",
                "CANCELLED"},
    # NOTE: UNKNOWN -> ATTEMPTING is deliberately absent. Re-executing an
    # intent whose external effect is unknowable would risk a duplicate
    # canonical action. UNKNOWN resolves only through verification reads:
    # VERIFIED_SUCCESS / VERIFIED_NOOP are reached when the recovery read
    # proves the outcome, never by re-attempting the mutation.
    "VERIFYING": {"VERIFIED_SUCCESS", "VERIFIED_NOOP", "SAFE_RETRY",
                  "FAILED_RETRYABLE", "FAILED_TERMINAL", "UNKNOWN"},
    "SAFE_RETRY": {"QUEUED", "CANCELLED"},
    "FAILED_RETRYABLE": {"QUEUED", "FAILED_TERMINAL", "CANCELLED"},
    "DEFERRED": {"QUEUED", "CANCELLED"},
    # Terminal states have no outbound transitions.
    "REJECTED": set(),
    "VERIFIED_SUCCESS": set(),
    "VERIFIED_NOOP": set(),
    "FAILED_TERMINAL": set(),
    "CANCELLED": set(),
}

TERMINAL = {"REJECTED", "VERIFIED_SUCCESS", "VERIFIED_NOOP",
            "FAILED_TERMINAL", "CANCELLED"}

ACTIVE_INTENT_STATES = set(STATES) - TERMINAL


def transitions_path():
    return os.path.join(STATE_ROOT, "transitions.jsonl")


def intents_path():
    return os.path.join(STATE_ROOT, "intents.jsonl")


def legal(frm, to):
    return to in TRANSITIONS.get(frm, set())


def record_intent(intent):
    """Persist the immutable intent record (creation only)."""
    append_jsonl(intents_path(), intent)


def transition(intent_id, frm, to, reason, evidence, actor="si-ig"):
    """Append one transition-evidence record. Raises on illegal transition.
    Returns the record."""
    if frm not in STATES or to not in STATES:
        raise ValueError("unknown state in transition %s -> %s" % (frm, to))
    if not legal(frm, to):
        raise ValueError(
            "ILLEGAL TRANSITION refused: %s -> %s (intent %s)"
            % (frm, to, intent_id))
    body = {
        "intent_id": intent_id,
        "from": frm,
        "to": to,
        "at": iso_now(),
        "reason": reason,
        "evidence": evidence,
        "actor": actor,
    }
    import json
    body["evidence_sha256"] = sha256_text(
        json.dumps({"intent_id": intent_id, "from": frm, "to": to,
                    "reason": reason, "evidence": evidence},
                   sort_keys=True, separators=(",", ":")))
    append_jsonl(transitions_path(), body)
    return body


def current_states():
    """Rebuild intent_id -> current state by replaying the transition log."""
    states = {}
    for rec in read_jsonl(transitions_path()):
        states[rec["intent_id"]] = rec["to"]
    return states


def state_of(intent_id):
    return current_states().get(intent_id)


def intents_index():
    idx = {}
    for rec in read_jsonl(intents_path()):
        idx[rec["intent_id"]] = rec
    return idx


def active_intents_for_handle(handle, states=None, index=None):
    """All non-terminal intents for one normalized handle. Used by the
    NO_DUPLICATE_ACTIVE_INTENT invariant: Instagram's never-re-engage rule
    is per-account, so one active intent per handle, not per post."""
    from siig_common import norm_handle
    h = norm_handle(handle)
    states = states if states is not None else current_states()
    index = index if index is not None else intents_index()
    out = []
    for iid, rec in index.items():
        if rec.get("target_handle") != h:
            continue
        st = states.get(iid)
        if st in ACTIVE_INTENT_STATES:
            out.append((iid, st))
    return out
