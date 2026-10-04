"""Authority UX by consequence: deterministic action tiering for FYD.

Binding source: ~/workspace/directives/2026-10-04-backend-assault-narrowed.md section 14.
The campaign compiler MUST call classify() before anything reaches an owner or an
external channel.

Authority scales with consequence, not with nervousness. The plumber experiences
"FYD handles things," not 47 security questions.

Tiers:
  LOW       -> automatic. Local draft/plan/preview/analysis.
  MEDIUM    -> preview with easy undo. Change to public FYD presentation.
  HIGH      -> explicit authorization per policy. Send, publish externally,
               spend money, modify an external account.
  VERY HIGH -> explicit bounded approval (scope + limit + expiry). Large
               audience, large spend, irreversible/destructive external action.
  UNKNOWN   -> fail closed. Kind not recognized. Never auto-dispatches; the
               compiler must treat it as requiring at least HIGH-level
               explicit authorization.

Rules are explicit if/elif over the action dict fields. No LLM calls, no tuned
heuristics. Action dict: {kind, target, spend_usd?, audience_size?,
reversible?, external?}
"""

LOW = "LOW"
MEDIUM = "MEDIUM"
HIGH = "HIGH"
VERY_HIGH = "VERY_HIGH"
UNKNOWN = "UNKNOWN"

CHECK_AUTOMATIC = "automatic"
CHECK_PREVIEW_WITH_EASY_UNDO = "preview_with_easy_undo"
CHECK_EXPLICIT_AUTHORIZATION = "explicit_authorization"
CHECK_EXPLICIT_BOUNDED_APPROVAL = "explicit_bounded_approval"

# spend thresholds (USD)
SPEND_HIGH_AT = 0          # any positive spend is at least HIGH
SPEND_VERY_HIGH_AT = 500   # spend >= 500 is VERY HIGH

# audience threshold
AUDIENCE_VERY_HIGH_AT = 10000  # audience >= 10000 is VERY HIGH

# Deterministic kind vocabularies. Kinds outside these fall to UNKNOWN (fail closed).
LOW_KINDS = frozenset({
    "draft_update",      # change local draft (campaign, copy, plan text)
    "plan_reorder",      # reorder private plan
    "preview_generate",  # generate preview / render
    "analyze_data",      # analyze data, produce insight
})

MEDIUM_KINDS = frozenset({
    "public_presentation_change",  # change what visitors see on the FYD site
})

HIGH_KINDS = frozenset({
    "publish_external",       # post to a third-party channel (e.g. Facebook)
    "send_communication",     # email / SMS / message a human
    "modify_external_account",  # change settings on an external account
})


def _num(value, default=0):
    """Coerce a numeric field; missing, None, or non-numeric -> default.
    Negative spend/audience is malformed data -> clamp to 0."""
    try:
        n = float(value) if value is not None else default
    except (TypeError, ValueError):
        n = default
    return max(n, 0)


def classify(action):
    """Classify an action by consequence.

    Returns (tier, required_check). Evaluation order is fixed: VERY HIGH
    escalators first, then HIGH, then MEDIUM, then LOW, then UNKNOWN.
    """
    kind = action.get("kind", "")
    target = action.get("target", "")
    spend = _num(action.get("spend_usd", 0))
    audience = _num(action.get("audience_size", 0))
    # reversible missing (None) is fail-closed: external actions that cannot
    # prove reversibility are treated as irreversible.
    reversible = action.get("reversible")
    external = bool(action.get("external", False))

    # --- VERY HIGH escalators (dominate everything below) ---
    if spend >= SPEND_VERY_HIGH_AT:
        return (VERY_HIGH, CHECK_EXPLICIT_BOUNDED_APPROVAL)
    if audience >= AUDIENCE_VERY_HIGH_AT:
        return (VERY_HIGH, CHECK_EXPLICIT_BOUNDED_APPROVAL)
    if external and not reversible:
        # irreversible or reversibility-unknown external action:
        # destructive-class by consequence
        return (VERY_HIGH, CHECK_EXPLICIT_BOUNDED_APPROVAL)

    # --- HIGH ---
    if spend > SPEND_HIGH_AT:
        return (HIGH, CHECK_EXPLICIT_AUTHORIZATION)
    if kind in HIGH_KINDS:
        return (HIGH, CHECK_EXPLICIT_AUTHORIZATION)

    # --- MEDIUM ---
    if kind in MEDIUM_KINDS:
        return (MEDIUM, CHECK_PREVIEW_WITH_EASY_UNDO)

    # --- LOW: local-only kinds on a non-external target ---
    if kind in LOW_KINDS and not external:
        return (LOW, CHECK_AUTOMATIC)

    # --- UNKNOWN: fail closed ---
    return (UNKNOWN, CHECK_EXPLICIT_AUTHORIZATION)


def explain(action):
    """Return the (tier, required_check, rule) triple for evidence/replay."""
    tier, check = classify(action)
    kind = action.get("kind", "")
    spend = _num(action.get("spend_usd", 0))
    audience = _num(action.get("audience_size", 0))
    reversible = action.get("reversible")
    external = bool(action.get("external", False))

    if tier == VERY_HIGH:
        if spend >= SPEND_VERY_HIGH_AT:
            rule = "spend_usd >= %d" % SPEND_VERY_HIGH_AT
        elif audience >= AUDIENCE_VERY_HIGH_AT:
            rule = "audience_size >= %d" % AUDIENCE_VERY_HIGH_AT
        else:
            rule = "external and not reversible"
    elif tier == HIGH:
        if spend > SPEND_HIGH_AT:
            rule = "spend_usd > 0"
        else:
            rule = "kind in HIGH_KINDS"
    elif tier == MEDIUM:
        rule = "kind in MEDIUM_KINDS"
    elif tier == LOW:
        rule = "kind in LOW_KINDS and not external"
    else:
        rule = "unrecognized kind or external local-kind: fail closed"
    return (tier, check, rule)
