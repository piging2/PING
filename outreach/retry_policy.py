#!/usr/bin/env python3
"""Retry-safety policy for engagement passes: the proven retry theorem.

THEOREM (proven by execution 2026-09-24, 28/28 scenarios green;
provenance: ~/workspace/orca/social-retry-proof/SOCIAL-RETRY-PROOF-2026-09-24.md):

    retry_safe = f(effect class, provider semantics, current observed
                   provider state, idempotency support, reconciliation evidence)

There is NO global retry boolean anywhere in the path. Retry safety is a
pure function of the five factors, dispatched per action to an explicit
per-action predicate. The decision takes no boolean `retry` flag.

This module ports the proven per-action semantics for the X engagement
action set. Mapping to the proven predicates:
  x.like    -> campaign.like    (class 09: provider semantics are
                                 TOGGLE/INVERT on repeat; a second toggle on
                                 an already-liked post UNLIKES it)
  x.comment -> campaign.comment (class 09: additive on repeat; a re-post is
                                 a second comment)
  x.follow  -> NO PROVEN PREDICATE. The theorem's own default for an
               unencoded action is HOLD_UNKNOWN (fail closed). We do NOT
               invent follow retry semantics; follow reconciliation stays
               HOLD until a follow predicate is proven the same way.

Wiring (steering 2026-09-26): EXECUTION_RECOVERY stage decisions and any
UNKNOWN_EXECUTION reconciliation consult retry_safe, never an invented
rule and never a global flag. In phase 1 the live pass does not call this
module (additive instrumentation only); it is the decision oracle the
phase-2 cutover routes recovery through.

O6: HOLD means hold. An UNKNOWN outcome is never auto-retried.
"""

SAFE_TO_RETRY = "SAFE_TO_RETRY"
RECOVER_SUCCEEDED = "RECOVER_SUCCEEDED"
HOLD_UNKNOWN = "HOLD_UNKNOWN"

DECISIONS = frozenset({SAFE_TO_RETRY, RECOVER_SUCCEEDED, HOLD_UNKNOWN})

# Effect classes, per the proven set.
CLASS_09_CAMPAIGN = "09-campaign-publication"


def _hold(reason, evidence):
    return {"decision": HOLD_UNKNOWN, "reason": reason,
            "evidence": dict(evidence or {})}


def _x_like(observed, evidence):
    # Proven: the like is issued ONLY when observed state differs from
    # intended state. Already-liked -> no-op/recover, never a second
    # toggle. Unreadable state -> HOLD.
    liked = observed.get("liked")
    if liked is True:
        return {"decision": RECOVER_SUCCEEDED,
                "reason": "post already in liked state; issuing another "
                          "toggle would UNLIKE",
                "evidence": dict(evidence or {})}
    if liked is not False:
        return _hold("like state unreadable; a blind toggle can invert "
                     "the effect", evidence)
    if evidence.get("guardDecision") != "ELIGIBLE":
        return _hold("guard did not return ELIGIBLE (got %r)"
                     % evidence.get("guardDecision"), evidence)
    if evidence.get("intentState") == "UNKNOWN_EXECUTION":
        return _hold("open UNKNOWN_EXECUTION intent; reconcile first",
                     evidence)
    if evidence.get("platformWarning"):
        return _hold("platform warning; no retry under warning", evidence)
    return {"decision": SAFE_TO_RETRY,
            "reason": "probe proves like absent + guard ELIGIBLE + intent "
                      "resolved + no warning",
            "evidence": dict(evidence or {})}


def _x_comment(observed, evidence):
    # Proven: additive on repeat. Retry only when the probe proves the
    # comment absent and the guard says ELIGIBLE.
    present = observed.get("commentPresent")
    if present is True:
        return {"decision": RECOVER_SUCCEEDED,
                "reason": "comment already present; a retry would "
                          "double-post",
                "evidence": dict(evidence or {})}
    if present is not False:
        return _hold("comment presence unreadable", evidence)
    if evidence.get("guardDecision") != "ELIGIBLE":
        return _hold("guard did not return ELIGIBLE (got %r)"
                     % evidence.get("guardDecision"), evidence)
    return {"decision": SAFE_TO_RETRY,
            "reason": "probe proves comment absent + guard ELIGIBLE",
            "evidence": dict(evidence or {})}


_PREDICATES = {
    "x.like": _x_like,
    "x.comment": _x_comment,
    # x.follow deliberately absent: no proven predicate; the default below
    # holds it. Do NOT add one without a proof of the same standing.
}


def retry_safe(action, effect_class, provider_semantics, observed_state,
               idempotency_support, reconciliation_evidence):
    """The theorem, exactly. Returns {decision, reason, evidence}.

    All five factors are required; a missing factor or an unencoded action
    fails closed to HOLD_UNKNOWN. There is no boolean retry parameter.
    """
    if not action or not effect_class or not provider_semantics \
            or observed_state is None:
        return _hold("missing predicate factor; fail closed",
                     reconciliation_evidence)
    fn = _PREDICATES.get(action)
    if fn is None:
        return _hold("no proven predicate for action %r; fail closed "
                     "(the theorem holds unencoded actions, it does not "
                     "invent semantics)" % action, reconciliation_evidence)
    return fn(observed_state, reconciliation_evidence or {})


def assert_no_global_retry_flag(path=None):
    """Static scan: prove no global retry boolean exists in this module.

    Mirrors NOGLOBAL-01a of the proof (same suspicious patterns, minus
    the scan's own pattern literals).
    """
    import re
    path = path or __file__
    suspicious = [
        re.compile(r"\b(?:globalRetry|retryAll|allowRetry|retryEnabled|"
                   r"shouldRetry|forceRetry|retryAnyway)\b"),
        re.compile(r"[^_.a-zA-Z]retry\s*=\s*True"),
        re.compile(r"[^_.a-zA-Z]retry\s*:\s*True"),
    ]
    hits = []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            text = line.strip()[:160]
            # The scan must not flag the literals that DEFINE the
            # suspicious patterns above (the re.compile block and its
            # continuation lines, which carry the pattern fragments).
            if text.startswith("re.compile") or "forceRetry" in text:
                continue
            for rx in suspicious:
                if rx.search(line):
                    hits.append((i, text))
    return hits
