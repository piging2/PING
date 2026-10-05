"""Cheapest relevant test for derivative-lineage: plain asserts, no deps.

Run: python3 -m pytest (if available) or python3 test_derivative_lineage.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lineage import (
    register_derivative,
    trace_stale_claim,
    spec_digest,
    strength,
    STRENGTH_ORDER,
    KINDS,
)


def sample_canonical():
    return {
        "artifact_id": "tech-report-042",
        "digest": "canonical-digest-placeholder",
        "claims": [
            {"id": "C1", "text": "Replay ordering is deterministic.", "state": "CONFIRMED"},
            {"id": "C2", "text": "Feed cut latency by half.", "state": "PARTIALLY_SUPPORTED"},
            {"id": "C3", "text": "Cut generalizes to other pipelines.", "state": "INFERRED"},
            {"id": "C4", "text": "Zero-overhead claim.", "state": "REFUTED"},
            {"id": "C5", "text": "Cost model is unknown.", "state": "UNKNOWN"},
        ],
    }


def test_strength_ordering_documented():
    assert STRENGTH_ORDER == (
        "REFUTED", "UNKNOWN", "INFERRED", "PARTIALLY_SUPPORTED", "CONFIRMED",
    )
    ranks = [strength(s) for s in STRENGTH_ORDER]
    assert ranks == sorted(ranks) and len(set(ranks)) == 5


def test_valid_derivative_registers_clean():
    # Omitting claims is fine; weakening a restatement is fine.
    rec = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "launch-post",
            "kind": "post",
            "included_claim_ids": ["C1", "C2"],
            "restated_states": {"C2": "INFERRED"},  # weaker than PARTIALLY_SUPPORTED
        },
    )
    assert rec["violations"] == []
    assert rec["derivative_id"] == "launch-post"
    assert rec["claim_ids"] == ["C1", "C2"]
    assert rec["effective_states"] == {"C1": "CONFIRMED", "C2": "INFERRED"}
    assert isinstance(rec["spec_digest"], str) and len(rec["spec_digest"]) == 64


def test_spec_digest_deterministic():
    spec = {
        "derivative_id": "d1",
        "kind": "video",
        "included_claim_ids": ["C1"],
        "restated_states": {},
    }
    assert spec_digest(spec) == spec_digest(spec)


def test_strengthened_restatement_flagged():
    # INFERRED -> CONFIRMED is a silent strengthening: must be flagged.
    rec = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "hype-video",
            "kind": "video",
            "included_claim_ids": ["C3"],
            "restated_states": {"C3": "CONFIRMED"},
        },
    )
    codes = [v["code"] for v in rec["violations"]]
    assert "STRENGTHENED_CLAIM" in codes
    v = next(v for v in rec["violations"] if v["code"] == "STRENGTHENED_CLAIM")
    assert v["claim_id"] == "C3"
    assert v["canonical_state"] == "INFERRED" and v["restated_state"] == "CONFIRMED"


def test_strengthened_refuted_flagged():
    # REFUTED -> UNKNOWN silently drops the denial: still a strengthening.
    rec = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "sloppy-email",
            "kind": "email",
            "included_claim_ids": ["C4"],
            "restated_states": {"C4": "UNKNOWN"},
        },
    )
    codes = [v["code"] for v in rec["violations"]]
    assert "REFUTED_CLAIM_INCLUDED" in codes
    assert "STRENGTHENED_CLAIM" in codes


def test_unknown_claim_id_flagged():
    rec = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "bad-short",
            "kind": "short",
            "included_claim_ids": ["C1", "C999"],
            "restated_states": {},
        },
    )
    codes = [v["code"] for v in rec["violations"]]
    assert "UNKNOWN_CLAIM_ID" in codes
    assert any(v["claim_id"] == "C999" for v in rec["violations"])


def test_refuted_claim_inclusion_flagged():
    # Included at restated CONFIRMED: refuted-inclusion AND strengthening.
    rec = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "mythic-article",
            "kind": "article",
            "included_claim_ids": ["C4"],
            "restated_states": {"C4": "CONFIRMED"},
        },
    )
    codes = [v["code"] for v in rec["violations"]]
    assert "REFUTED_CLAIM_INCLUDED" in codes


def test_refuted_claim_excluded_or_labeled_clean():
    # Omission is clean.
    rec_omit = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "careful-diagram",
            "kind": "diagram",
            "included_claim_ids": ["C1"],
            "restated_states": {},
        },
    )
    assert rec_omit["violations"] == []
    # Explicit refuted labeling is clean.
    rec_labeled = register_derivative(
        sample_canonical(),
        {
            "derivative_id": "honest-article",
            "kind": "article",
            "included_claim_ids": ["C1", "C4"],
            "restated_states": {"C4": "REFUTED"},
        },
    )
    assert rec_labeled["violations"] == []
    assert rec_labeled["effective_states"]["C4"] == "REFUTED"


def test_stale_claim_trace_returns_exactly_affected():
    rec_a = register_derivative(
        sample_canonical(),
        {"derivative_id": "post-a", "kind": "post",
         "included_claim_ids": ["C1", "C2"], "restated_states": {}},
    )
    rec_b = register_derivative(
        sample_canonical(),
        {"derivative_id": "video-b", "kind": "video",
         "included_claim_ids": ["C2", "C3"], "restated_states": {}},
    )
    rec_c = register_derivative(
        sample_canonical(),
        {"derivative_id": "email-c", "kind": "email",
         "included_claim_ids": ["C1"], "restated_states": {}},
    )
    trace = trace_stale_claim(sample_canonical(), "C2", "REFUTED", [rec_a, rec_b, rec_c])
    assert trace["affected_derivative_ids"] == ["post-a", "video-b"]
    assert trace["affected_count"] == 2
    assert trace["old_state"] == "PARTIALLY_SUPPORTED"
    assert trace["new_state"] == "REFUTED"
    assert trace["direction"] == "weakened"


def test_stale_claim_trace_empty_when_no_derivative_has_it():
    rec = register_derivative(
        sample_canonical(),
        {"derivative_id": "post-a", "kind": "post",
         "included_claim_ids": ["C1"], "restated_states": {}},
    )
    trace = trace_stale_claim(sample_canonical(), "C3", "CONFIRMED", [rec])
    assert trace["affected_derivative_ids"] == []
    assert trace["affected_count"] == 0
    assert trace["direction"] == "strengthened"


def test_kinds_accepted():
    for kind in KINDS:
        rec = register_derivative(
            sample_canonical(),
            {"derivative_id": "x-" + kind, "kind": kind,
             "included_claim_ids": [], "restated_states": {}},
        )
        assert rec["violations"] == []


TESTS = [
    test_strength_ordering_documented,
    test_valid_derivative_registers_clean,
    test_spec_digest_deterministic,
    test_strengthened_restatement_flagged,
    test_strengthened_refuted_flagged,
    test_unknown_claim_id_flagged,
    test_refuted_claim_inclusion_flagged,
    test_refuted_claim_excluded_or_labeled_clean,
    test_stale_claim_trace_returns_exactly_affected,
    test_stale_claim_trace_empty_when_no_derivative_has_it,
    test_kinds_accepted,
]


if __name__ == "__main__":
    for fn in TESTS:
        fn()
        print("PASS", fn.__name__)
    print("all %d tests passed" % len(TESTS))
