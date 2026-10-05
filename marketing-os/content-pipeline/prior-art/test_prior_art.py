"""Cheapest relevant tests for idea #10 (prior-art). Plain asserts so they run
under `python3 -m pytest` if available, else `python3 test_prior_art.py`.
"""

from collision import classify_collision, COLLISION_CLASSES
from novelty import record_novelty, novelty_statement, NOVELTY_CLASSES


def _item(id, overlap=None, **kw):
    base = {
        "id": id,
        "title": "",
        "relation_notes": "",
        "overlap": overlap or {},
    }
    base.update(kw)
    return base


# --- all 6 collision classes ------------------------------------------------

def test_known_principle_and_application():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"principle": True, "application": True})],
    )
    assert out["items"][0]["class"] == "KNOWN", out


def test_known_but_different_application():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"principle": True, "application": False},
               relation_notes="same principle, different field")],
    )
    assert out["items"][0]["class"] == "KNOWN BUT DIFFERENT APPLICATION", out


def test_known_principle_new_empirical_result():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"principle": True, "application": True},
               thesis_new_empirical_result=True)],
    )
    assert out["items"][0]["class"] == "KNOWN PRINCIPLE + NEW EMPIRICAL RESULT", out


def test_known_principle_new_result_different_application():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"principle": True, "application": False},
               thesis_new_empirical_result=True)],
    )
    assert out["items"][0]["class"] == "KNOWN PRINCIPLE + NEW EMPIRICAL RESULT", out


def test_apparently_novel_implementation():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", relation_notes="same domain, different method",
               novelty_locus="implementation")],
    )
    assert out["items"][0]["class"] == "APPARENTLY NOVEL IMPLEMENTATION", out


def test_apparently_novel_result():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", relation_notes="same domain, different finding",
               novelty_locus="result")],
    )
    assert out["items"][0]["class"] == "APPARENTLY NOVEL RESULT", out


def test_unknown_no_information():
    out = classify_collision([{"id": "c1", "text": "claim"}], [_item("p1")])
    assert out["items"][0]["class"] == "UNKNOWN", out


# --- rule edge cases ----------------------------------------------------------

def test_known_result_overlap_is_known():
    # Finding already reported in prior art -> KNOWN, even with a new principle.
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"empirical_result": True},
               thesis_new_empirical_result=True)],
    )
    assert out["items"][0]["class"] == "KNOWN", out  # fail closed


def test_shared_implementation_alone_is_novel_result():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"implementation": True},
               relation_notes="same tool, new finding")],
    )
    assert out["items"][0]["class"] == "APPARENTLY NOVEL RESULT", out


def test_locus_ignored_when_overlap_fires():
    # novelty_locus is only consulted when no overlap flags fire.
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [_item("p1", {"principle": True, "application": True},
               novelty_locus="implementation")],
    )
    assert out["items"][0]["class"] == "KNOWN", out


def test_bad_locus_rejected():
    try:
        classify_collision(
            [{"id": "c1", "text": "claim"}],
            [_item("p1", relation_notes="x", novelty_locus="magic")],
        )
    except ValueError:
        return
    raise AssertionError("bad novelty_locus accepted")


def test_all_six_classes_reachable():
    got = {
        "principle+application -> KNOWN": classify_collision(
            [], [_item("a", {"principle": True, "application": True})])["items"][0]["class"],
        "principle only -> diff app": classify_collision(
            [], [_item("a", {"principle": True}, relation_notes="x")])["items"][0]["class"],
        "principle + new result -> new result class": classify_collision(
            [], [_item("a", {"principle": True}, thesis_new_empirical_result=True,
                           relation_notes="x")])["items"][0]["class"],
        "no flags + impl locus": classify_collision(
            [], [_item("a", relation_notes="x", novelty_locus="implementation")])["items"][0]["class"],
        "no flags + result locus": classify_collision(
            [], [_item("a", relation_notes="x")])["items"][0]["class"],
        "no info": classify_collision([], [_item("a")])["items"][0]["class"],
    }
    assert set(got.values()) == set(COLLISION_CLASSES), got


# --- UNKNOWN never upgraded ---------------------------------------------------

def test_unknown_never_upgraded_to_novel():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}, {"id": "c2", "text": "claim"}],
        [_item("u1"), _item("u2")],
    )
    summary = out["thesis_novelty_summary"]
    assert "No defensible novelty claim" in summary, summary
    assert "Defensible novelty (" not in summary, summary
    assert "no item classifies as apparently novel" in summary, summary
    assert "u1" in summary and "u2" in summary  # listed as uninformative
    assert "contribute nothing" in summary, summary


def test_summary_names_novel_and_unknown_separately():
    out = classify_collision(
        [{"id": "c1", "text": "claim"}],
        [
            _item("n1", relation_notes="new method", novelty_locus="implementation"),
            _item("k1", {"principle": True, "application": True}),
            _item("u1"),
        ],
    )
    summary = out["thesis_novelty_summary"]
    assert "n1" in summary and "apparently novel implementation" in summary
    assert "k1" in summary
    assert "u1" in summary


# --- novelty recorder -----------------------------------------------------------

def test_record_novelty_all_three_classes():
    claims = [
        {"id": "c1", "text": "measured X", "novelty_class": "empirical"},
        {"id": "c2", "text": "because of Y", "novelty_class": "mechanistic"},
        {"id": "c3", "text": "reframes Z", "novelty_class": "explanatory"},
    ]
    recorded = record_novelty(claims)
    assert [c["novelty_class"] for c in recorded] == list(NOVELTY_CLASSES)
    assert [c["id"] for c in recorded] == ["c1", "c2", "c3"]


def test_record_novelty_bad_enum_rejected():
    try:
        record_novelty([{"id": "c1", "text": "x", "novelty_class": "revolutionary"}])
    except ValueError:
        return
    raise AssertionError("bad novelty_class accepted")


def test_record_novelty_missing_class_rejected():
    try:
        record_novelty([{"id": "c1", "text": "x"}])
    except ValueError:
        return
    raise AssertionError("missing novelty_class accepted")


def test_novelty_statement_is_honest_aggregate():
    claims = [
        {"id": "c1", "text": "a", "novelty_class": "empirical"},
        {"id": "c2", "text": "b", "novelty_class": "empirical"},
        {"id": "c3", "text": "c", "novelty_class": "mechanistic"},
    ]
    stmt = novelty_statement(claims)
    assert stmt == (
        "3 of 3 claims recorded with a novelty class "
        "(2 empirical, 1 mechanistic, 0 explanatory). "
        "This restates the recorded classes only."
    ), stmt


def test_novelty_statement_rejects_nothing_beyond_classes():
    import re
    stmt = novelty_statement([{"id": "c1", "text": "a", "novelty_class": "explanatory"}])
    lowered = stmt.lower()
    assert re.search(r"\bnovel\b", lowered) is None, stmt  # "novelty" is fine
    for word in ("invent", "first ever", "groundbreaking", "revolutionary"):
        assert word not in lowered, stmt


def run_all():
    names = sorted(n for n, f in globals().items()
                   if n.startswith("test_") and callable(f))
    for name in names:
        globals()[name]()
        print("PASS", name)
    print("%d/%d tests passed" % (len(names), len(names)))


if __name__ == "__main__":
    run_all()
