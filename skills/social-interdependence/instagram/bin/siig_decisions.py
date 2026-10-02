#!/usr/bin/env python3
"""siig_decisions.py: decision records and the taste/curation layer.

TASTE IS NOT ELIGIBILITY (binding): subjective ranking lives in a layer
ABOVE the guard's eligibility verdict and never touches the eligibility
data files. The decision record carries every input the decision rested on;
there is no opaque single AI score acting as authority. Priority features
order and select within budget; they never convert INELIGIBLE to ELIGIBLE.

Decision record fields (cross-platform contract):
candidate_id, actor, target, relationship, content, platform,
action_candidates, identity_confidence, relationship_context, evidence,
capabilities, policy_result, budget_result, materiality, uncertainty,
saturation, outcome_history, decision, reason.
"""
import re

from siig_common import (PLATFORM, ACTOR, ACCOUNT, norm_handle, target_ref,
                         iso_now)

# Comment content policy, machine-checked (from the engagement log rules).
MAX_COMMENT_WORDS = 20
FORBIDDEN_PHRASES = ("ping social", "http://", "https://", "www.",
                     "call me", "dm me", "link in bio")
CUSTOMER_POSING = ("i need", "i want", "quote", "estimate", "how much",
                   "can you come", "looking for someone")


def normalize_candidate(raw, seq):
    """DISCOVERED -> NORMALIZED. Builds the vetting haystack the way the
    fixed CDP funnel does: handle + header name + full body-text fallback.
    Identity precision gate: the country field rejects ambiguous geography
    (Durango-MX vs Durango-CO class)."""
    handle = norm_handle(raw.get("handle"))
    haystack = " ".join(x for x in (
        raw.get("handle") or "",
        raw.get("header_name") or "",
        raw.get("post_text") or "") if x)
    return {
        "candidate_id": "ig-cand-%d-%s" % (seq, handle or "unknown"),
        "platform": PLATFORM,
        "handle": handle,
        "post_url": raw.get("post_url"),
        "post_text": raw.get("post_text"),
        "header_name": raw.get("header_name"),
        "country": raw.get("country"),
        "city": raw.get("city"),
        "media_type": raw.get("media_type"),
        "suggested_action": raw.get("suggested_action"),
        "draft": raw.get("draft"),
        "haystack": haystack,
        "target_ref": target_ref(handle, raw.get("post_url")),
    }


def identity_gate(cand):
    """Precision gate on identity. Returns (ok, confidence, note). The
    country field is authoritative for the Durango-MX vs Durango-CO class:
    a non-US country fails closed. Missing country is UNKNOWN, which does
    not dispatch."""
    if not cand["handle"]:
        return False, 0.0, "empty handle: no identity to judge"
    country = (cand.get("country") or "").upper()
    if country and country != "US":
        return False, 0.0, ("identity ambiguous: country=%s fails the "
                            "precision gate (Durango-MX class)" % country)
    if not country:
        return False, 0.0, "identity confidence unknown: no country signal"
    return True, 1.0, "country=US precision gate passed"


def prohibited_target(cand, prohibited):
    """Envelope prohibited-targets check (name-based; no invented handles).
    Covers the Monument View no-autonomous-contact owner order."""
    hay = (" ".join(x for x in (cand["handle"], cand["header_name"],
                                cand["post_text"]) if x)).lower()
    for entry in prohibited:
        needle = entry.get("match", "").lower()
        if needle and needle.replace(" ", "") in hay.replace(" ", ""):
            return entry
    return None


def priority_features(cand, relationship_ctx):
    """Taste-layer features. Explicit and inspectable; the score orders
    within budget only."""
    text = (cand.get("post_text") or "").lower()
    feats = {
        "trade_relevant": any(w in text for w in
                              ("plumb", "roof", "hvac", "electric", "fence",
                               "landscap", "concrete", "tree", "remodel")),
        "photo_or_carousel": cand.get("media_type") in ("photo", "carousel"),
        "has_caption": bool((cand.get("post_text") or "").strip()),
        "new_relationship": relationship_ctx.get("touches", 0) == 0,
    }
    score = sum(1 for v in feats.values() if v)
    return feats, score


def check_comment_content(text):
    """Machine checks for the comment content policy. Returns a list of
    violations (empty = passes)."""
    problems = []
    words = (text or "").split()
    if len(words) > MAX_COMMENT_WORDS:
        problems.append("over %d words (%d)" % (MAX_COMMENT_WORDS,
                                                len(words)))
    low = (text or "").lower()
    for phrase in FORBIDDEN_PHRASES:
        if phrase in low:
            problems.append("forbidden phrase: %s" % phrase)
    for phrase in CUSTOMER_POSING:
        if phrase in low:
            problems.append("customer-posing phrase: %s" % phrase)
    if "\u2014" in (text or "") or "\u2013" in (text or ""):
        problems.append("em dash present")
    return problems


def build_decision_record(cand, guard_verdict, capabilities, budget_result,
                          relationship_ctx, outcome_history, prohibited_hit,
                          identity_ok, identity_confidence, identity_note,
                          action="like", content=None):
    feats, score = priority_features(cand, relationship_ctx)
    materiality = "low" if action == "like" else "medium"
    uncertainty = []
    if not cand.get("post_text"):
        uncertainty.append("no post text observed")
    if not cand.get("post_url"):
        uncertainty.append("no post URL; handle-scoped intent")
    if prohibited_hit:
        decision, reason = "REJECT", (
            "prohibited target: %s (%s)"
            % (prohibited_hit.get("match"), prohibited_hit.get("reason")))
    elif not identity_ok:
        decision, reason = "REJECT", "identity gate: %s" % identity_note
    elif guard_verdict["decision"] != "ELIGIBLE":
        decision, reason = "REJECT", (
            "policy_result=%s (%s)" % (guard_verdict["decision"],
                                      guard_verdict["primary_reason"]))
    elif not budget_result.get("reserved"):
        decision, reason = "DEFER", "budget exhausted this window"
    else:
        decision, reason = "PROCEED", "eligible, identity verified, budgeted"
    return {
        "candidate_id": cand["candidate_id"],
        "actor": ACTOR,
        "account": ACCOUNT,
        "target": {"handle": cand["handle"],
                   "target_ref": cand["target_ref"],
                   "post_url": cand.get("post_url")},
        "relationship": relationship_ctx,
        "content": content,
        "platform": PLATFORM,
        "action_candidates": ["like", "comment"],
        "chosen_action": action,
        "identity_confidence": identity_confidence,
        "identity_note": identity_note,
        "relationship_context": relationship_ctx,
        "evidence": {"guard_verdict": guard_verdict,
                     "envelope_hash": (guard_verdict.get("envelope_hash")
                                       if isinstance(guard_verdict, dict)
                                       else None)},
        "capabilities": capabilities,
        "policy_result": {"decision": guard_verdict["decision"],
                          "primary_reason": guard_verdict["primary_reason"],
                          "reasons": guard_verdict["reasons"]},
        "budget_result": budget_result,
        "materiality": materiality,
        "uncertainty": uncertainty,
        "saturation": {"already_engaged": guard_verdict["decision"] ==
                       "INELIGIBLE" and "ALREADY_ENGAGED" in
                       guard_verdict.get("reasons", [])},
        "outcome_history": outcome_history,
        "priority_features": feats,
        "priority_score": score,
        "decision": decision,
        "reason": reason,
        "decided_at": iso_now(),
    }
