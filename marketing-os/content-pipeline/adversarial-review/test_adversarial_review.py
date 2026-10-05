"""Cheapest relevant test for adversarial-review (idea #11): plain asserts, no deps."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import review
from review import (
    ATTACK_SURFACE,
    ObjectionError,
    record_objection,
    get_objection,
    respond,
    resolve,
    review_report,
    report_all,
    trustworthy_sentence,
    reset,
)


MANDATED_CATEGORIES = (
    "causality",
    "sample-size",
    "novelty",
    "benchmark-fairness",
    "confounders",
    "unverifiable-numbers",
    "cherry-picking",
    "terminology",
    "security-disclosure",
    "reproducibility",
    "prior-art",
    "overgeneralization",
    "sensationalism",
    "title-vs-experiment",
)


def test_attack_surface_is_the_14_category_checklist():
    assert tuple(ATTACK_SURFACE) == MANDATED_CATEGORIES
    assert len(ATTACK_SURFACE) == 14


def test_full_lifecycle_open_responded_resolved():
    reset()
    o = record_objection("ART-1", "sample-size", "n=4 is too small for the claim", "high")
    assert o["id"] == "OBJ-0001"
    assert o["state"] == "OPEN"
    assert o["resolution"] is None
    r = respond(o["id"], "we now report n=40 with confidence intervals", ["replay-log"])
    assert r["state"] == "RESPONDED"
    assert r["response_text"].startswith("we now report")
    assert r["support_refs"] == ["replay-log"]
    t = resolve(o["id"], "RESOLVED", "sample enlarged, intervals added")
    assert t["state"] == "RESOLVED"
    assert t["resolution"] == "RESOLVED"
    assert get_objection(o["id"])["state"] == "RESOLVED"


def test_resolve_without_response_rejected():
    reset()
    o = record_objection("ART-2", "causality", "correlation presented as causation", "high")
    try:
        resolve(o["id"], "RESOLVED", "fixed wording")
    except ObjectionError as e:
        assert "OPEN" in str(e)
    else:
        raise AssertionError("resolve on OPEN objection must be rejected")
    assert get_objection(o["id"])["state"] == "OPEN"


def test_terminal_is_terminal():
    reset()
    o = record_objection("ART-3", "prior-art", "prior art not cited", "medium")
    respond(o["id"], "added citation", ["paper-2024"])
    resolve(o["id"], "UNRESOLVED", "citation added but mechanism differs")
    for bad in (
        lambda: respond(o["id"], "second response", []),
        lambda: resolve(o["id"], "RESOLVED", "try again"),
    ):
        try:
            bad()
        except ObjectionError:
            pass
        else:
            raise AssertionError("terminal objection must reject further transitions")
    assert get_objection(o["id"])["state"] == "UNRESOLVED"


def test_invalid_inputs_rejected():
    reset()
    for bad_call in (
        lambda: record_objection("A", "not-a-category", "text", "high"),
        lambda: record_objection("A", "causality", "text", "critical"),
        lambda: record_objection("A", "causality", "", "high"),
        lambda: record_objection("", "causality", "text", "high"),
    ):
        try:
            bad_call()
        except ObjectionError:
            pass
        else:
            raise AssertionError("invalid record_objection input must be rejected")
    try:
        respond("OBJ-9999", "text", [])
    except ObjectionError:
        pass
    else:
        raise AssertionError("respond on unknown id must be rejected")
    try:
        resolve("OBJ-9999", "RESOLVED", "note")
    except ObjectionError:
        pass
    else:
        raise AssertionError("resolve on unknown id must be rejected")


def test_report_counts_correct():
    reset()
    a = record_objection("ART-4", "sample-size", "n too small", "high")
    b = record_objection("ART-4", "sample-size", "no power analysis", "medium")
    c = record_objection("ART-4", "sensationalism", "headline overstates", "low")
    for o, res, note in (
        (a, "RESOLVED", "sample enlarged"),
        (b, "PARTIALLY_RESOLVED", "partial fix"),
        (c, "UNRESOLVED", "stands as written"),
    ):
        respond(o["id"], "defense", [])
        resolve(o["id"], res, note)
    rep = review_report([get_objection(x) for x in ("OBJ-0001", "OBJ-0002", "OBJ-0003")])
    assert rep["total"] == 3
    assert rep["by_category"]["sample-size"] == 2
    assert rep["by_category"]["sensationalism"] == 1
    assert rep["by_category"]["causality"] == 0
    assert rep["by_resolution"] == {
        "RESOLVED": 1,
        "PARTIALLY_RESOLVED": 1,
        "UNRESOLVED": 1,
    }
    # no high-severity UNRESOLVED -> not blocked, but limitations remain
    assert rep["blocking"] == []
    assert rep["publication_recommendation"] == "PROCEED_WITH_LIMITATIONS"
    assert len(rep["trustworthy_sentences"]) == 1


def test_high_severity_unresolved_blocks_publication():
    reset()
    o = record_objection("ART-5", "unverifiable-numbers", "the 40% figure has no source", "high")
    respond(o["id"], "figure is internal", [])
    resolve(o["id"], "UNRESOLVED", "no public source exists")
    rep = report_all()
    assert rep["blocking"] == [o["id"]]
    assert rep["publication_recommendation"] == "BLOCKED"
    assert len(rep["trustworthy_sentences"]) == 1


def test_trustworthy_sentence_includes_objection_text():
    reset()
    o = record_objection("ART-6", "title-vs-experiment", "title promises X, experiment shows Y", "medium")
    respond(o["id"], "title kept for impact", [])
    resolve(o["id"], "UNRESOLVED", "owner kept the title")
    s = trustworthy_sentence(get_objection(o["id"]))
    assert "title promises X, experiment shows Y" in s
    assert "title-vs-experiment" in s
    assert "unresolved" in s.lower()


def test_clear_only_when_everything_resolved():
    reset()
    a = record_objection("ART-7", "terminology", "term inflated", "low")
    b = record_objection("ART-7", "reproducibility", "steps missing", "low")
    respond(a["id"], "reworded", [])
    resolve(a["id"], "RESOLVED", "reworded")
    respond(b["id"], "steps added", ["repro-run-3"])
    resolve(b["id"], "RESOLVED", "reproduced cleanly")
    rep = report_all()
    assert rep["publication_recommendation"] == "CLEAR"
    assert rep["trustworthy_sentences"] == []
    assert rep["blocking"] == []


def test_open_objection_forces_limitations_not_clear():
    reset()
    record_objection("ART-8", "confounders", "no control group", "medium")
    rep = report_all()
    assert rep["publication_recommendation"] == "PROCEED_WITH_LIMITATIONS"
    assert rep["blocking"] == []
    assert rep["trustworthy_sentences"] == []


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print("PASS %s" % t.__name__)
        except AssertionError as e:
            failed += 1
            print("FAIL %s: %s" % (t.__name__, e))
    print("%d/%d passed" % (len(tests) - failed, len(tests)))
    sys.exit(1 if failed else 0)
