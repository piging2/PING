"""Cheapest relevant test for idea #3 (marker-metrics).

8-marker representative sample covering all 5 resolutions; asserts counts,
research_accuracy with UNRESOLVED excluded, and editorial distance weights.
Run: python3 -m pytest test_marker_metrics.py   (or: python3 test_marker_metrics.py)
"""

from metrics import measure_markers, editorial_distance, measure_pipeline, EDIT_WEIGHTS

# 8-marker sample: CONFIRMED x2, CORRECTED x1, QUALIFIED x2, REMOVED x1, UNRESOLVED x2
SAMPLE_MARKERS = [
    {"id": "m-001", "resolution": "CONFIRMED", "note": "statistic checked out"},
    {"id": "m-002", "resolution": "CONFIRMED"},
    {"id": "m-003", "resolution": "CORRECTED", "note": "number was off by 2x"},
    {"id": "m-004", "resolution": "QUALIFIED", "note": "needed 'for small shops' scope"},
    {"id": "m-005", "resolution": "QUALIFIED"},
    {"id": "m-006", "resolution": "REMOVED", "note": "claim not supportable"},
    {"id": "m-007", "resolution": "UNRESOLVED", "note": "pending source reply"},
    {"id": "m-008", "resolution": "UNRESOLVED"},
]


def test_counts_cover_all_five_resolutions():
    report = measure_markers(SAMPLE_MARKERS)
    assert report["counts"] == {
        "CONFIRMED": 2,
        "CORRECTED": 1,
        "QUALIFIED": 2,
        "REMOVED": 1,
        "UNRESOLVED": 2,
    }, report["counts"]
    assert report["total"] == 8


def test_research_accuracy_excludes_unresolved():
    report = measure_markers(SAMPLE_MARKERS)
    # (CONFIRMED + 0.5*QUALIFIED) / (CONFIRMED + CORRECTED + QUALIFIED + REMOVED)
    # = (2 + 0.5*2) / (2 + 1 + 2 + 1) = 3 / 6 = 0.5 ; the two UNRESOLVED must not count
    assert report["research_accuracy"] == 0.5, report["research_accuracy"]
    assert report["unresolved_ids"] == ["m-007", "m-008"]
    assert "UNRESOLVED" in report["unresolved_note"]


def test_research_accuracy_all_unresolved_is_none():
    report = measure_markers([{"id": "u-1", "resolution": "UNRESOLVED"}])
    assert report["research_accuracy"] is None
    assert report["accuracy_note"] != ""


def test_invalid_resolution_rejected():
    try:
        measure_markers([{"id": "x", "resolution": "MAYBE"}])
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for invalid resolution")


def test_editorial_distance_weights():
    edits = [
        {"edit_class": "CLAIM REMOVED"},          # 3.0
        {"edit_class": "PERSONAL EXPERIENCE ADDED"},  # 1.5, irreducibly human
        {"edit_class": "JARGON REMOVED"},         # 1.0
        {"edit_class": "CLAIM QUALIFIED"},        # 2.0
    ]
    report = editorial_distance(edits)
    assert report["editorial_distance"] == 7.5, report["editorial_distance"]
    assert report["edit_counts"]["CLAIM REMOVED"] == 1
    assert report["total_edits"] == 4


def test_irreducibly_human_flagged_separately():
    edits = [
        {"edit_class": "PERSONAL EXPERIENCE ADDED"},
        {"edit_class": "HOOK REWRITTEN"},
    ]
    report = editorial_distance(edits)
    assert report["human_flagged_edits"] == [0], report["human_flagged_edits"]
    # Still counted in the distance; just flagged so it is not optimized away.
    assert report["editorial_distance"] == EDIT_WEIGHTS["PERSONAL EXPERIENCE ADDED"] + EDIT_WEIGHTS["HOOK REWRITTEN"]


def test_unknown_edit_class_rejected():
    try:
        editorial_distance([{"edit_class": "VIBES IMPROVED"}])
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for unknown edit class")


def test_measure_pipeline_combines_both():
    report = measure_pipeline(SAMPLE_MARKERS, [{"edit_class": "HUMOR ADDED/REMOVED"}])
    assert report["markers"]["research_accuracy"] == 0.5
    assert report["edits"]["editorial_distance"] == 1.0


def test_determinism_no_wall_clock():
    # Same input twice must produce the exact same output; nothing time-dependent.
    a = measure_pipeline(SAMPLE_MARKERS, [{"edit_class": "HOOK REWRITTEN"}])
    b = measure_pipeline(SAMPLE_MARKERS, [{"edit_class": "HOOK REWRITTEN"}])
    assert a == b


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
    print("OK: %d marker-metrics tests passed" % len(tests))
