"""Cheapest relevant tests for idea #12 (epistemic metadata).

Run: python3 -m pytest  (falls back to plain asserts: python3 test_epistemic_metadata.py)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from grades import grade_reproducibility
from disagreement import classify_disagreement, to_research_mission, MISSION_FEEDING
from attribution import classify_attribution
from chain import track_chain, project_lineage, EFFECT_CHAIN_STAGES, LINEAGE_NODES


def test_all_r_grades_reachable():
    assert grade_reproducibility({})["grade"] == "R0"
    assert grade_reproducibility({"has_trace": True})["grade"] == "R1"
    assert grade_reproducibility({"has_trace": True, "has_code": True})["grade"] == "R2"
    assert grade_reproducibility(
        {"has_trace": True, "has_code": True, "deterministic_local": True}
    )["grade"] == "R3"
    assert grade_reproducibility(
        {"has_trace": True, "has_code": True, "deterministic_local": True,
         "clean_env_repro": True}
    )["grade"] == "R4"
    assert grade_reproducibility(
        {"has_trace": True, "has_code": True, "deterministic_local": True,
         "clean_env_repro": True, "independent_repro": True}
    )["grade"] == "R5"


def test_grade_does_not_upgrade_on_incoherent_evidence():
    # independent reproduction claimed without trace/code: capped, not upgraded
    g = grade_reproducibility({"independent_repro": True})
    assert g["grade"] == "R0", g
    g = grade_reproducibility({"independent_repro": True, "clean_env_repro": True})
    assert g["grade"] == "R0", g


def test_grade_deterministic():
    ev = {"has_trace": True, "has_code": True}
    assert grade_reproducibility(ev) == grade_reproducibility(dict(ev))


def test_disagreement_each_class_classifiable():
    samples = {
        "AGREEMENT": "I agree, this is spot on and exactly right.",
        "TECHNICAL_CORRECTION": "Correction: that number is wrong, the correct value should be 42.",
        "COUNTEREXAMPLE": "Here is a counterexample that contradicts your claim: it fails to account for X.",
        "TERMINOLOGY_DISPUTE": "This is a misuse of the term; the definition of that word means something else.",
        "PRIOR_ART_REFERENCE": "Prior art: this was published in 2019 and already been done.",
        "REPRODUCTION_ATTEMPT": "I tried to reproduce your results and ran your code in my lab.",
        "REPRODUCTION_SUCCESS": "I successfully reproduced your results and confirmed your results.",
        "REPRODUCTION_FAILURE": "I could not reproduce this; the reproduction failed with different results.",
        "IMPLEMENTATION_QUESTION": "How did you implement this, and which version and what library did you use?",
        "LOW_INFORMATION_REACTION": "Nice, cool post, thanks lol.",
    }
    for cls, text in samples.items():
        r = classify_disagreement(text)
        assert r["classification"] == cls, (cls, r)
        assert r["candidates"] == [cls]


def test_disagreement_unclassified_when_no_match():
    r = classify_disagreement("The weather in Denver is mild this week.")
    assert r["classification"] == "UNCLASSIFIED"
    assert r["candidates"] == []


def test_disagreement_tie_lists_candidates_never_silently_picks():
    r = classify_disagreement("I agree with the premise, and here is a counterexample to weigh.")
    assert r["classification"] is None, r
    assert set(r["candidates"]) == {"AGREEMENT", "COUNTEREXAMPLE"}, r


def test_mission_proposal_only_for_feeding_classes():
    ctx = {"source_ref": "threads/post/123", "artifact_id": "A-1"}
    feeding = {"TECHNICAL_CORRECTION", "COUNTEREXAMPLE", "PRIOR_ART_REFERENCE", "REPRODUCTION_ATTEMPT"}
    assert feeding == set(MISSION_FEEDING)
    for cls in feeding:
        m = to_research_mission(cls, ctx)
        assert m is not None
        assert m["proposed_type"] == "INTELLIGENCE_RESEARCH"
        assert m["trigger_class"] == cls
        assert isinstance(m["questions"], list) and len(m["questions"]) > 0
        assert m["source_ref"] == "threads/post/123"
    non_feeding = ["AGREEMENT", "TERMINOLOGY_DISPUTE", "REPRODUCTION_SUCCESS",
                   "REPRODUCTION_FAILURE", "IMPLEMENTATION_QUESTION",
                   "LOW_INFORMATION_REACTION", "UNCLASSIFIED", None, "BOGUS"]
    for cls in non_feeding:
        assert to_research_mission(cls, ctx) is None, cls


def test_attribution_never_upgrades_temporal_only():
    for extra in ({}, {"mechanism_evidence": True}):
        r = classify_attribution(dict({"temporal_only": True}, **extra))
        assert r["strength"] == "TEMPORALLY_ASSOCIATED", r
        assert "PLAUSIBLY" not in r["strength"] and "EXPERIMENTAL" not in r["strength"]


def test_attribution_experiment_needs_confounders():
    r = classify_attribution({"experiment": True, "confounders_addressed": True})
    assert r["strength"] == "EXPERIMENTALLY_SUPPORTED"
    r = classify_attribution({"experiment": True, "confounders_addressed": False})
    assert r["strength"] == "CAUSALITY_UNESTABLISHED"


def test_attribution_no_signal_not_negative():
    r = classify_attribution({})
    assert r["strength"] == "CAUSALITY_UNESTABLISHED"
    assert "absence" in r["rule"].lower()


def test_chain_marks_missing_links_unknown():
    r = track_chain([
        {"stage": "ARTIFACT", "evidence_ref": "media/build-7"},
        {"stage": "DISTRIBUTION", "evidence_ref": "pub/post-9"},
    ])
    assert [l["stage"] for l in r["links"]] == list(EFFECT_CHAIN_STAGES)
    by = {l["stage"]: l for l in r["links"]}
    assert by["ARTIFACT"]["state"] == "KNOWN"
    assert by["ARTIFACT"]["evidence_refs"] == ["media/build-7"]
    assert by["AUTHORIZATION"]["state"] == "UNKNOWN"
    assert "reason" in by["AUTHORIZATION"]
    assert by["VERIFIED_EFFECT"]["state"] == "UNKNOWN"
    assert "AUTHORIZATION" in r["unknown_stages"]
    assert any("WORKER_COMPLETED != EFFECT VERIFIED" in g for g in r["guard_notes"])
    assert any("ENGAGEMENT != BUSINESS OUTCOME" in g for g in r["guard_notes"])


def test_lineage_never_invents_missing_info():
    r = project_lineage({
        "RESEARCH": {"produced_by": "intel-pass-12", "digest_version": "sha256:abc123",
                     "evidence": "obs/44", "changed_from_previous": "n/a first run",
                     "approval": "none needed", "blocks_next": "source packet completeness"},
    })
    assert [n["node"] for n in r["nodes"]] == list(LINEAGE_NODES)
    research = r["nodes"][0]
    assert research["digest_version"] == "sha256:abc123"
    assert research["missing"] == []
    edit = [n for n in r["nodes"] if n["node"] == "EDIT"][0]
    for q in ("produced_by", "digest_version", "evidence",
              "changed_from_previous", "approval", "blocks_next"):
        assert edit[q] == "UNKNOWN", (q, edit)
    assert len(edit["missing"]) == 6


def test_lineage_deterministic():
    inp = {"RESEARCH": {"produced_by": "x", "digest_version": "d1"}}
    assert project_lineage(inp) == project_lineage(dict(inp))


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print("ALL %d TESTS PASSED" % len(tests))
