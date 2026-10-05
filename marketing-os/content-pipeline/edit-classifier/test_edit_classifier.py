"""Tests for classifier.py and script_diff.py.

Run with `python3 -m pytest` or `python3 test_edit_classifier.py`.
Stdlib only; every test is a plain assert on deterministic functions.
"""

from classifier import classify_edits
from script_diff import diff_script_recording


def classes_of(findings):
    return [f["class"] for f in findings]


def types_of(findings):
    return [f["type"] for f in findings]


SHARED_OPEN = "This is the shared opening paragraph every thesis keeps.\n\n"


def test_claim_removed():
    v1 = SHARED_OPEN + "The new scheduler reduces latency by 40 percent.\n\nClosing line.\n"
    v2 = SHARED_OPEN + "Closing line.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "CLAIM REMOVED" in found, found


def test_claim_qualified():
    v1 = SHARED_OPEN + "Deterministic replay guarantees identical output.\n"
    v2 = SHARED_OPEN + "Deterministic replay likely guarantees identical output.\n"
    found = classify_edits(v1, v2)
    assert "CLAIM QUALIFIED" in classes_of(found), found
    assert "likely" in found[0]["evidence"] or any(
        "likely" in f["evidence"] for f in found
    )


def test_technical_detail_added():
    v1 = SHARED_OPEN + "The pipeline is fast.\n\nIt scales well.\n"
    v2 = (
        SHARED_OPEN
        + "The pipeline is fast.\n\n"
        + "Internally it uses an append-only event log with idempotent commit markers.\n\n"
        + "It scales well.\n"
    )
    found = classes_of(classify_edits(v1, v2))
    assert "TECHNICAL DETAIL ADDED" in found, found


def test_counterargument_added():
    v1 = SHARED_OPEN + "Automation helps every shop.\n"
    v2 = (
        SHARED_OPEN
        + "Automation helps every shop.\n\n"
        + "However, critics argue the added complexity slows small teams down.\n"
    )
    found = classes_of(classify_edits(v1, v2))
    assert "COUNTERARGUMENT ADDED" in found, found


def test_hook_rewritten():
    v1 = "The cloud is just someone else's computer.\n\nBody paragraph here.\n"
    v2 = "Your data lives on a stranger's hard drive.\n\nBody paragraph here.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "HOOK REWRITTEN" in found, found


def test_humor_added():
    v1 = SHARED_OPEN + "The build was stable.\n"
    v2 = SHARED_OPEN + "The build was stable.\n\nFun fact: the first version was written on a napkin. (Yes, really.)\n"
    found = classes_of(classify_edits(v1, v2))
    assert "HUMOR ADDED" in found, found


def test_humor_removed():
    v1 = SHARED_OPEN + "Fun fact: the build once deleted itself. (Yes, really.)\n\nDone.\n"
    v2 = SHARED_OPEN + "Done.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "HUMOR REMOVED" in found, found


def test_jargon_removed():
    v1 = SHARED_OPEN + "We will leverage our synergistic ecosystem to deliver value.\n"
    v2 = SHARED_OPEN + "We will use our tools to deliver value.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "JARGON REMOVED" in found, found


def test_explanation_compressed():
    v1 = SHARED_OPEN + (
        "The pipeline first normalizes every incoming event into a canonical byte "
        "representation, then assigns a deterministic identity before any projection "
        "is allowed to observe it.\n"
    )
    v2 = SHARED_OPEN + "The pipeline normalizes events into canonical bytes and assigns identity.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "EXPLANATION COMPRESSED" in found, found


def test_example_replaced():
    v1 = SHARED_OPEN + "For example, a bakery in Grand Junction doubled online orders.\n"
    v2 = SHARED_OPEN + "For example, a plumber in Montrose doubled online orders.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "EXAMPLE REPLACED" in found, found


def test_structure_reordered():
    v1 = SHARED_OPEN + "Paragraph one about pricing.\n\nParagraph two about onboarding.\n\nParagraph three about support.\n"
    v2 = SHARED_OPEN + "Paragraph two about onboarding.\n\nParagraph one about pricing.\n\nParagraph three about support.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "STRUCTURE REORDERED" in found, found


def test_personal_experience_added():
    v1 = SHARED_OPEN + "Outages are stressful.\n"
    v2 = SHARED_OPEN + "Outages are stressful.\n\nI remember the first time I debugged a production outage at 2am.\n"
    found = classes_of(classify_edits(v1, v2))
    assert "PERSONAL EXPERIENCE ADDED" in found, found


def test_editorial_rejection():
    v1 = SHARED_OPEN + "A long thesis about automation with many detailed arguments and evidence.\n\nMore paragraphs of careful reasoning here.\n"
    v2 = "No. Start over.\n"
    found = classify_edits(v1, v2)
    assert classes_of(found) == ["EDITORIAL REJECTION"], found


def test_no_false_positives_on_trivial_edit():
    v1 = SHARED_OPEN + "The pipeline is fast.\n"
    v2 = SHARED_OPEN + "The pipeline is fast!\n"
    assert classify_edits(v1, v2) == [], classify_edits(v1, v2)


# ---------------- script -> recording diff ----------------


def test_number_changed_flagged():
    script = "The hall has 44 seats available."
    transcript = "The hall has 45 seats available."
    found = diff_script_recording(script, transcript)
    assert "NUMBER_CHANGED" in types_of(found), found


def test_contraction_not_flagged():
    script = "We cannot guarantee results."
    transcript = "We can't guarantee results."
    found = diff_script_recording(script, transcript)
    assert found == [], found


def test_case_punctuation_not_flagged():
    script = "Hello World, welcome."
    transcript = "hello world welcome!"
    found = diff_script_recording(script, transcript)
    assert found == [], found


def test_section_omitted_flagged():
    script = "# Pricing\nOur plans start at ten dollars.\n\n# Contact\nCall us anytime.\n"
    transcript = "Our plans start at ten dollars."
    found = diff_script_recording(script, transcript)
    assert "SECTION_OMITTED" in types_of(found), found
    assert any("Contact" in f["location"] for f in found if f["type"] == "SECTION_OMITTED")


def test_qualifier_removed_flagged():
    script = "It might improve throughput."
    transcript = "It improves throughput."
    found = diff_script_recording(script, transcript)
    assert "QUALIFIER_REMOVED" in types_of(found), found


def test_disclaimer_removed_flagged():
    script = "Results are strong. Disclaimer: results may vary."
    transcript = "Results are strong."
    found = diff_script_recording(script, transcript)
    assert "DISCLAIMER_REMOVED" in types_of(found), found


def test_proper_noun_changed_flagged():
    script = "Our shop in Denver opens Monday."
    transcript = "Our shop in Boulder opens Monday."
    found = diff_script_recording(script, transcript)
    assert "PROPER_NOUN_CHANGED" in types_of(found), found
    assert any("Denver" in f["evidence"] for f in found if f["type"] == "PROPER_NOUN_CHANGED")


def test_new_claim_introduced_flagged():
    script = "The pipeline is fast."
    transcript = "The pipeline is fast. It also increases revenue by 30 percent."
    found = diff_script_recording(script, transcript)
    assert "NEW_CLAIM_INTRODUCED" in types_of(found), found


def test_claim_changed_flagged():
    script = "The new scheduler always eliminates downtime."
    transcript = "The new scheduler usually eliminates downtime."
    found = diff_script_recording(script, transcript)
    assert "CLAIM_CHANGED" in types_of(found), found


TESTS = [
    test_claim_removed,
    test_claim_qualified,
    test_technical_detail_added,
    test_counterargument_added,
    test_hook_rewritten,
    test_humor_added,
    test_humor_removed,
    test_jargon_removed,
    test_explanation_compressed,
    test_example_replaced,
    test_structure_reordered,
    test_personal_experience_added,
    test_editorial_rejection,
    test_no_false_positives_on_trivial_edit,
    test_number_changed_flagged,
    test_contraction_not_flagged,
    test_case_punctuation_not_flagged,
    test_section_omitted_flagged,
    test_qualifier_removed_flagged,
    test_disclaimer_removed_flagged,
    test_proper_noun_changed_flagged,
    test_new_claim_introduced_flagged,
    test_claim_changed_flagged,
]


if __name__ == "__main__":
    failed = 0
    for t in TESTS:
        try:
            t()
            print("PASS", t.__name__)
        except AssertionError as e:
            failed += 1
            print("FAIL", t.__name__, "->", e)
    print("%d/%d passed" % (len(TESTS) - failed, len(TESTS)))
    raise SystemExit(1 if failed else 0)
