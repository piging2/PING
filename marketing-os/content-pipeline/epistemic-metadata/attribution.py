"""Attribution strength classifier.

Rule table (explicit boolean inputs; sequence alone never implies causality):

    evidence = {
        "temporal_only":      bool,  # only temporal association observed (X before Y)
        "experiment":         bool,  # an experiment / intervention was run
        "confounders_addressed": bool,  # confounders controlled or ruled out
        "mechanism_evidence": bool,  # supporting mechanism / dose-response /
                                     # consistency evidence exists (non-experimental)
        "evidence_conflicting": bool,  # positive and negative evidence clash
    }

    experiment AND confounders_addressed        -> EXPERIMENTALLY_SUPPORTED
    experiment AND NOT confounders_addressed   -> CAUSALITY_UNESTABLISHED
    mechanism_evidence AND NOT temporal_only   -> PLAUSIBLY_CONTRIBUTED
    temporal_only (and NOT experiment)         -> TEMPORALLY_ASSOCIATED
    otherwise                                  -> CAUSALITY_UNESTABLISHED

Binding invariants:
  - temporal_only evidence can NEVER yield PLAUSIBLY_CONTRIBUTED or above.
  - NO SIGNAL YET != NEGATIVE: absence of evidence yields
    CAUSALITY_UNESTABLISHED, never a negative causal claim.
"""

TEMPORALLY_ASSOCIATED = "TEMPORALLY_ASSOCIATED"
PLAUSIBLY_CONTRIBUTED = "PLAUSIBLY_CONTRIBUTED"
EXPERIMENTALLY_SUPPORTED = "EXPERIMENTALLY_SUPPORTED"
CAUSALITY_UNESTABLISHED = "CAUSALITY_UNESTABLISHED"

_ALL_FLAGS = (
    "temporal_only",
    "experiment",
    "confounders_addressed",
    "mechanism_evidence",
    "evidence_conflicting",
)


def _normalize(evidence):
    evidence = evidence or {}
    return {flag: bool(evidence.get(flag, False)) for flag in _ALL_FLAGS}


def classify_attribution(evidence):
    """Classify attribution strength. Returns a dict:
        strength   one of the four classes
        rule       the rule-table row that fired
        evidence   normalized boolean inputs
        caveat     explicit note when the inputs are weak or conflicting
    """
    e = _normalize(evidence)

    if e["evidence_conflicting"]:
        strength = CAUSALITY_UNESTABLISHED
        rule = "conflicting evidence: positive and negative signals clash; cannot support causality"
    elif e["experiment"] and e["confounders_addressed"]:
        strength = EXPERIMENTALLY_SUPPORTED
        rule = "experiment run with confounders addressed"
    elif e["experiment"] and not e["confounders_addressed"]:
        strength = CAUSALITY_UNESTABLISHED
        rule = "experiment ran but confounders unaddressed; causality unestablished"
    elif e["mechanism_evidence"] and not e["temporal_only"]:
        strength = PLAUSIBLY_CONTRIBUTED
        rule = "non-experimental supporting evidence (mechanism/dose-response/consistency)"
    elif e["temporal_only"]:
        strength = TEMPORALLY_ASSOCIATED
        rule = "temporal association only; sequence alone never implies causality"
    else:
        strength = CAUSALITY_UNESTABLISHED
        rule = "no supporting evidence present; absence of evidence is not evidence of absence"

    caveat = None
    if e["temporal_only"] and e["mechanism_evidence"]:
        caveat = ("mechanism_evidence present alongside temporal_only; "
                  "temporal sequence still cannot establish causality -- "
                  "stays TEMPORALLY_ASSOCIATED")
    if strength == TEMPORALLY_ASSOCIATED:
        caveat = (caveat + " " if caveat else "") + "post hoc is not propter hoc"

    return {
        "strength": strength,
        "rule": rule,
        "evidence": e,
        "caveat": caveat,
    }
