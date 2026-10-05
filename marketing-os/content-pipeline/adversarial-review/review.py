"""Adversarial reviewer objection tracker (MarketingOS content pipeline, idea #11).

Binding source: Nolan's 2026-10-01 content directive:
"Adversarial reviewer: attacks causality, sample size, novelty, benchmark
fairness, confounders, unverifiable numbers, cherry-picking, terminology,
security disclosure, reproducibility, prior art, overgeneralization,
sensationalism, title-vs-experiment. Objections become structured evidence:
OBJECTION -> RESPONSE -> SUPPORT -> RESOLUTION."

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module is machinery, not an authority:
it records objections and computes advisory publication recommendations;
it never publishes, and the recommendation never overrides the owner.

State machine (enforced):
    OPEN -> RESPONDED -> {RESOLVED | PARTIALLY_RESOLVED | UNRESOLVED}
Terminal states are final: there is no reopen.
"""

# The explicit 14-category attack checklist, as data. Order is the directive's
# attack order; each entry is the one-line question the reviewer must answer.
ATTACK_SURFACE = {
    "causality": "Does the artifact claim causation the evidence cannot support?",
    "sample-size": "Is the sample too small to carry the claimed effect?",
    "novelty": "Is the novelty claim true, or is it known under another name?",
    "benchmark-fairness": "Are baselines fair, or rigged to flatter the result?",
    "confounders": "What uncontrolled variables could explain the outcome?",
    "unverifiable-numbers": "Can every number be traced to a source or reproduction?",
    "cherry-picking": "Were runs, metrics, or examples selected to look good?",
    "terminology": "Is terminology precise, consistent, and non-inflated?",
    "security-disclosure": "Does publication leak a vulnerability or secret?",
    "reproducibility": "Can an independent party reproduce the result from the evidence?",
    "prior-art": "Is prior art cited, or silently omitted?",
    "overgeneralization": "Does the claim reach beyond what was actually tested?",
    "sensationalism": "Is the framing honest, or hype dressed as finding?",
    "title-vs-experiment": "Does the title promise more than the experiment delivers?",
}

SEVERITIES = ("low", "medium", "high")

RESOLUTIONS = ("RESOLVED", "PARTIALLY_RESOLVED", "UNRESOLVED")

RECOMMENDATIONS = ("BLOCKED", "PROCEED_WITH_LIMITATIONS", "CLEAR")


class ObjectionError(ValueError):
    """Raised when an objection transition or input violates the state machine."""


_objections = {}


def reset():
    """Clear the in-memory objection registry. Used by tests for determinism."""
    _objections.clear()


def _require(obj_id):
    try:
        return _objections[obj_id]
    except KeyError:
        raise ObjectionError("unknown objection id %r" % (obj_id,))


def record_objection(artifact_id, category, objection_text, severity):
    """Record a new objection. Returns the objection dict with state OPEN."""
    if not artifact_id or not isinstance(artifact_id, str):
        raise ObjectionError("artifact_id must be a non-empty string")
    if category not in ATTACK_SURFACE:
        raise ObjectionError(
            "unknown attack category %r; must be one of %s"
            % (category, sorted(ATTACK_SURFACE))
        )
    if not objection_text or not isinstance(objection_text, str):
        raise ObjectionError("objection_text must be a non-empty string")
    if severity not in SEVERITIES:
        raise ObjectionError(
            "severity %r invalid; must be one of %s" % (severity, SEVERITIES)
        )
    obj_id = "OBJ-%04d" % (len(_objections) + 1,)
    objection = {
        "id": obj_id,
        "artifact_id": artifact_id,
        "category": category,
        "objection_text": objection_text,
        "severity": severity,
        "state": "OPEN",
        "response_text": None,
        "support_refs": [],
        "resolution": None,
        "resolution_note": None,
    }
    _objections[obj_id] = objection
    return objection


def get_objection(obj_id):
    """Return the objection dict for an id, or raise ObjectionError."""
    return _require(obj_id)


def respond(obj_id, response_text, support_refs=None):
    """Record the defense's response: OPEN -> RESPONDED."""
    objection = _require(obj_id)
    if objection["state"] != "OPEN":
        raise ObjectionError(
            "cannot respond to objection %s in state %s (only OPEN can be responded to)"
            % (obj_id, objection["state"])
        )
    if not response_text or not isinstance(response_text, str):
        raise ObjectionError("response_text must be a non-empty string")
    refs = list(support_refs) if support_refs is not None else []
    objection["response_text"] = response_text
    objection["support_refs"] = refs
    objection["state"] = "RESPONDED"
    return objection


def resolve(obj_id, resolution, resolution_note):
    """Resolve a RESPONDED objection to a terminal state."""
    objection = _require(obj_id)
    if objection["state"] == "OPEN":
        raise ObjectionError(
            "cannot resolve objection %s: it is OPEN and has no response yet"
            % (obj_id,)
        )
    if objection["state"] in RESOLUTIONS:
        raise ObjectionError(
            "objection %s is already terminal (%s); terminal is terminal"
            % (obj_id, objection["resolution"])
        )
    if resolution not in RESOLUTIONS:
        raise ObjectionError(
            "resolution %r invalid; must be one of %s" % (resolution, RESOLUTIONS)
        )
    if not resolution_note or not isinstance(resolution_note, str):
        raise ObjectionError("resolution_note must be a non-empty string")
    objection["resolution"] = resolution
    objection["resolution_note"] = resolution_note
    objection["state"] = resolution
    return objection


def trustworthy_sentence(objection):
    """Render one UNRESOLVED objection as an honest limitation sentence.

    Deterministic template; always carries the original objection text verbatim.
    """
    return (
        "Limitation (%s): %s Raised by the adversarial reviewer and left "
        "unresolved at publication time; treat as an honest boundary on what "
        "this artifact establishes."
        % (objection["category"], objection["objection_text"])
    )


def review_report(objections):
    """Compile the review report for an iterable of objection dicts.

    Returns {total, by_category, by_resolution, blocking, trustworthy_sentences,
    publication_recommendation}. Recommendation is advisory: BLOCKED when a
    high-severity objection remains UNRESOLVED, PROCEED_WITH_LIMITATIONS when
    anything is still open or partially resolved, CLEAR otherwise.
    """
    objections = list(objections)
    by_category = {cat: 0 for cat in ATTACK_SURFACE}
    by_resolution = {res: 0 for res in RESOLUTIONS}
    blocking = []
    sentences = []
    for objection in sorted(objections, key=lambda o: o["id"]):
        by_category[objection["category"]] += 1
        state = objection["state"]
        if state in RESOLUTIONS:
            by_resolution[state] += 1
        if state == "UNRESOLVED":
            if objection["severity"] == "high":
                blocking.append(objection["id"])
            sentences.append(trustworthy_sentence(objection))
    if blocking:
        recommendation = "BLOCKED"
    elif any(o["state"] != "RESOLVED" for o in objections):
        recommendation = "PROCEED_WITH_LIMITATIONS"
    else:
        recommendation = "CLEAR"
    return {
        "total": len(objections),
        "by_category": by_category,
        "by_resolution": by_resolution,
        "blocking": blocking,
        "trustworthy_sentences": sentences,
        "publication_recommendation": recommendation,
    }


def report_all():
    """review_report() over every objection in the registry."""
    return review_report(list(_objections.values()))
