"""Cheapest relevant tests for computed content features (idea #9).

Runs under `python3 -m pytest` or directly: `python3 test_content_features.py`.
All asserts are plain; no network, no DB, no fixtures beyond two dicts.
"""

import copy

from features import (
    NOVELTY_CLASSES,
    compute_features,
)

# Fixture A: strong-evidence, surprising artifact.
STRONG_SURPRISING = {
    "claims": [
        {"id": "c1", "state": "CONFIRMED",
         "evidence_refs": ["e1", "e2", "e3", "e4"],
         "counterevidence": [], "reproduction_grade": "R5"},
        {"id": "c2", "state": "CONFIRMED",
         "evidence_refs": ["e5", "e6", "e7"],
         "counterevidence": [], "reproduction_grade": "R4"},
        {"id": "c3", "state": "PARTIALLY_SUPPORTED",
         "evidence_refs": ["e8", "e9", "e10"],
         "counterevidence": ["x1"], "reproduction_grade": "R3"},
    ],
    "counterintuitiveness": 0.9,
    "practical_consequence": 0.9,
    "novelty_to_audience": 0.9,
    "explanation_cost": 2,
    "novelty_class": "empirical",
    "audience_signals": {
        "interests": ["home service automation", "ai concierge", "evidence"],
        "intended_audience": ["home service automation", "ai concierge"],
    },
}

# Fixture B: weak-evidence, obvious artifact.
WEAK_OBVIOUS = {
    "claims": [
        {"id": "c1", "state": "INFERRED",
         "evidence_refs": ["e1"],
         "counterevidence": ["x1", "x2"], "reproduction_grade": "R1"},
        {"id": "c2", "state": "UNKNOWN",
         "evidence_refs": [],
         "counterevidence": [], "reproduction_grade": "R0"},
        {"id": "c3", "state": "REFUTED",
         "evidence_refs": ["e2", "e3", "e4"],
         "counterevidence": ["x3"], "reproduction_grade": "R0"},
    ],
    "counterintuitiveness": 0.2,
    "practical_consequence": 0.3,
    "novelty_to_audience": 0.2,
    "explanation_cost": 4,
    "novelty_class": "explanatory",
    "audience_signals": {
        "interests": ["sports", "cooking"],
        "intended_audience": ["home service automation"],
    },
}

NUMERIC_FEATURES = (
    "surprise_density", "evidence_strength", "reproducibility",
    "practical_consequence", "audience_fit", "novelty_to_audience",
)


def test_monotonicity_strong_surprising_scores_higher():
    a = compute_features(copy.deepcopy(STRONG_SURPRISING))
    b = compute_features(copy.deepcopy(WEAK_OBVIOUS))
    fa, fb = a["features"], b["features"]
    assert fa["surprise_density"] > fb["surprise_density"], (fa, fb)
    assert fa["evidence_strength"] > fb["evidence_strength"], (fa, fb)
    assert fa["reproducibility"] > fb["reproducibility"], (fa, fb)
    # Headline recommendation must rank A above B.
    rank = {"reject": 0, "weak": 1, "candidate": 2}
    assert rank[a["recommendation"]] > rank[b["recommendation"]], (a, b)
    assert a["recommendation"] == "candidate"
    assert b["recommendation"] == "reject"


def test_advisory_flag_present_and_publication_never_authorized():
    for fixture in (STRONG_SURPRISING, WEAK_OBVIOUS):
        out = compute_features(copy.deepcopy(fixture))
        assert out["recommendation_is_advisory"] is True
        assert out["authorizes_publication"] is False
        assert out["recommendation"] in ("candidate", "weak", "reject")


def test_features_in_documented_ranges():
    for fixture in (STRONG_SURPRISING, WEAK_OBVIOUS):
        out = compute_features(copy.deepcopy(fixture))
        f = out["features"]
        for name in NUMERIC_FEATURES:
            assert 0.0 <= f[name] <= 1.0, (name, f[name])
        assert f["novelty_class"] in NOVELTY_CLASSES, f["novelty_class"]
        assert f["explanation_cost"] in (1, 2, 3, 4, 5), f["explanation_cost"]


def test_deterministic_same_input_identical_output():
    first = compute_features(copy.deepcopy(STRONG_SURPRISING))
    second = compute_features(copy.deepcopy(STRONG_SURPRISING))
    assert first == second


def test_empty_claims_scores_zero_never_crashes():
    artifact = copy.deepcopy(STRONG_SURPRISING)
    artifact["claims"] = []
    out = compute_features(artifact)
    f = out["features"]
    assert f["evidence_strength"] == 0.0
    assert f["reproducibility"] == 0.0
    assert f["surprise_density"] == 0.0
    assert out["recommendation"] == "reject"
    assert out["recommendation_is_advisory"] is True


def test_epistemic_state_never_upgraded_by_scoring():
    # An INFERRED claim with many refs must still score below a CONFIRMED
    # claim with the same refs: scoring must never upgrade epistemic state.
    base = {"id": "c", "evidence_refs": ["e1", "e2", "e3"],
            "counterevidence": [], "reproduction_grade": "R3"}
    inferred = dict(base, state="INFERRED")
    confirmed = dict(base, state="CONFIRMED")
    a = copy.deepcopy(STRONG_SURPRISING); a["claims"] = [inferred]
    b = copy.deepcopy(STRONG_SURPRISING); b["claims"] = [confirmed]
    assert (compute_features(a)["features"]["evidence_strength"]
            < compute_features(b)["features"]["evidence_strength"])


if __name__ == "__main__":
    test_monotonicity_strong_surprising_scores_higher()
    test_advisory_flag_present_and_publication_never_authorized()
    test_features_in_documented_ranges()
    test_deterministic_same_input_identical_output()
    test_empty_claims_scores_zero_never_crashes()
    test_epistemic_state_never_upgraded_by_scoring()
    print("all content-features tests passed")
