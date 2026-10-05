"""Reproducibility grades R0-R5 as publication metadata.

Rule table (ladder semantics, highest-first; every grade requires the full
evidence set of the grade below it, so evidence can never be inflated):

    R5: independent_repro  + clean_env_repro + deterministic_local + has_code + has_trace
    R4: clean_env_repro    + deterministic_local + has_code + has_trace
    R3: deterministic_local + has_code + has_trace
    R2: has_code            + has_trace
    R1: has_trace
    R0: none of the above (assertion only)

grade_reproducibility() returns the HIGHEST grade whose full required evidence
set is present. Missing flags default to False (treated as absent, never
assumed). Non-monotone evidence (e.g. independent_repro without has_trace) is
NOT rewarded: the grade is capped at what the coherent evidence set supports.

Inputs are explicit booleans:
    has_trace         trace / screenshots / recorded run artifacts exist
    has_code          code / methodology disclosed
    deterministic_local  deterministic local reproduction performed
    clean_env_repro   reproduction in a clean environment performed
    independent_repro reproduction by an independent party succeeded
"""

R5 = "R5"
R4 = "R4"
R3 = "R3"
R2 = "R2"
R1 = "R1"
R0 = "R0"

GRADE_LABELS = {
    R0: "assertion only",
    R1: "trace / screenshots",
    R2: "code / methodology disclosed",
    R3: "deterministic local reproduction",
    R4: "clean-environment reproduction",
    R5: "independent reproduction",
}

# Ordered highest-first: (grade, tuple of required flags).
_RULE_TABLE = (
    (R5, ("has_trace", "has_code", "deterministic_local", "clean_env_repro", "independent_repro")),
    (R4, ("has_trace", "has_code", "deterministic_local", "clean_env_repro")),
    (R3, ("has_trace", "has_code", "deterministic_local")),
    (R2, ("has_trace", "has_code")),
    (R1, ("has_trace",)),
    (R0, ()),
)

_ALL_FLAGS = ("has_trace", "has_code", "deterministic_local", "clean_env_repro", "independent_repro")


def _normalize(evidence):
    """Coerce to explicit booleans; missing/unknown flags are False (absent)."""
    evidence = evidence or {}
    return {flag: bool(evidence.get(flag, False)) for flag in _ALL_FLAGS}


def grade_reproducibility(evidence):
    """Grade reproducibility evidence to an R-grade.

    Returns a dict:
        grade                 one of R0..R5
        label                 human-readable grade meaning
        rule_matched          the rule-table row that fired
        evidence              the normalized boolean inputs
        missing_for_next_grade  flags that would need to flip to reach the
                                grade above (empty for R5)
    """
    flags = _normalize(evidence)

    grade = R0
    required = ()
    for candidate, req in _RULE_TABLE:
        if all(flags[f] for f in req):
            grade, required = candidate, req
            break

    # What would the next grade up require that we lack?
    order = [R0, R1, R2, R3, R4, R5]
    idx = order.index(grade)
    missing = []
    if idx < len(order) - 1:
        next_req = dict(_RULE_TABLE)[order[idx + 1]]
        missing = [f for f in next_req if not flags[f]]

    return {
        "grade": grade,
        "label": GRADE_LABELS[grade],
        "rule_matched": {"grade": grade, "required_flags": list(required)},
        "evidence": flags,
        "missing_for_next_grade": missing,
    }
