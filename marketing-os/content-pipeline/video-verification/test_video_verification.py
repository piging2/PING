"""Tests for the multimodal video verification engine (idea #6).

One test per finding class (8 classes) plus verdict blocking/non-blocking/pass
logic, using a minimal shared report fixture. Plain asserts; runs under
`python3 -m pytest` or directly with `python3 test_video_verification.py`.
"""

from verify import verify_media, verdict, FINDING_CLASSES


INPUTS = {"now": "2026-10-04T12:00:00", "screenshot_freshness_days": 30}


def clean_report():
    return {
        "recording_digest": "sha256:abc123",
        "transcript": (
            "PING uses three projection planes. Growth was nine percent this "
            "quarter. We serve two hundred businesses."
        ),
        "visual_timeline": [
            {"t": 0.0, "description": "title card", "onscreen_text": "PING Social"},
            {"t": 12.5, "description": "architecture diagram",
             "onscreen_text": "three projection planes"},
            {"t": 30.0, "description": "growth chart",
             "onscreen_text": "nine percent growth"},
        ],
        "subtitles": [
            {"t": 0.0, "text": "PING uses three projection planes."},
            {"t": 12.5, "text": "Growth was nine percent this quarter."},
        ],
        "screenshots": [
            {"id": "ss1", "captured_at": "2026-10-01T10:00:00",
             "described_content": "dashboard overview, sales chart"},
        ],
        "diagrams": [
            {"id": "d1", "claims_shown": ["PING uses three projection planes"]},
        ],
    }


def classes_of(findings):
    return [f["class"] for f in findings]


def test_pass_clean_video():
    findings = verify_media(clean_report(), INPUTS)
    assert findings == [], findings
    assert verdict(findings) == "PASS"
    assert "PASS" in FINDING_CLASSES
    assert "PASS" not in classes_of(findings), "PASS is a verdict, never a finding"


def test_content_error_onscreen_number_not_spoken():
    report = clean_report()
    report["visual_timeline"][1]["onscreen_text"] = "five hundred businesses on board"
    findings = verify_media(report, INPUTS)
    assert "CONTENT ERROR" in classes_of(findings), findings
    assert verdict(findings) == "PUBLICATION_BLOCKED"


def test_visual_contradiction_diagram_disagrees_with_narration():
    report = clean_report()
    report["diagrams"][0]["claims_shown"] = [
        "the architecture has four projection planes"
    ]
    findings = verify_media(report, INPUTS)
    assert "VISUAL CONTRADICTION" in classes_of(findings), findings
    assert verdict(findings) == "NEEDS_FIX"


def test_subtitle_error_number_invented():
    report = clean_report()
    report["subtitles"][1]["text"] = "Growth was nine hundred percent this quarter."
    findings = verify_media(report, INPUTS)
    assert "SUBTITLE ERROR" in classes_of(findings), findings
    assert verdict(findings) == "NEEDS_FIX"


def test_subtitle_omission_is_not_an_error():
    # Subtitles may condense (omit numbers); they must not invent them.
    report = clean_report()
    report["subtitles"][1]["text"] = "Growth this quarter."
    findings = verify_media(report, INPUTS)
    assert "SUBTITLE ERROR" not in classes_of(findings), findings


def test_privacy_secret_risk_onscreen():
    report = clean_report()
    report["visual_timeline"][2]["onscreen_text"] = "deploy with api_key=sk-live-abc123XYZ"
    findings = verify_media(report, INPUTS)
    assert "PRIVACY-SECRET RISK" in classes_of(findings), findings
    assert verdict(findings) == "PUBLICATION_BLOCKED"


def test_privacy_secret_risk_screenshot_description():
    report = clean_report()
    report["screenshots"][0]["described_content"] = (
        "terminal window showing the production password in plain text"
    )
    findings = verify_media(report, INPUTS)
    assert "PRIVACY-SECRET RISK" in classes_of(findings), findings


def test_stale_screenshot():
    report = clean_report()
    report["screenshots"][0]["captured_at"] = "2026-01-15T10:00:00"
    findings = verify_media(report, INPUTS)
    assert "STALE SCREENSHOT" in classes_of(findings), findings
    assert verdict(findings) == "NEEDS_FIX"


def test_missing_captured_at_fails_closed():
    report = clean_report()
    del report["screenshots"][0]["captured_at"]
    findings = verify_media(report, INPUTS)
    assert "STALE SCREENSHOT" in classes_of(findings), findings


def test_unsupported_visual_claim():
    report = clean_report()
    report["diagrams"][0]["claims_shown"] = [
        "enterprise dashboard ships in every tier"
    ]
    findings = verify_media(report, INPUTS)
    assert "UNSUPPORTED VISUAL CLAIM" in classes_of(findings), findings
    assert verdict(findings) == "NEEDS_FIX"


def test_timing_editorial_issue_non_monotonic():
    report = clean_report()
    report["visual_timeline"] = [
        {"t": 0.0, "description": "a", "onscreen_text": ""},
        {"t": 30.0, "description": "b", "onscreen_text": ""},
        {"t": 12.5, "description": "c", "onscreen_text": ""},
    ]
    findings = verify_media(report, INPUTS)
    assert "TIMING-EDITORIAL ISSUE" in classes_of(findings), findings


def test_timing_editorial_issue_negative():
    report = clean_report()
    report["subtitles"].append({"t": -1.0, "text": "Cold open."})
    findings = verify_media(report, INPUTS)
    assert "TIMING-EDITORIAL ISSUE" in classes_of(findings), findings


def test_verdict_blocking_vs_non_blocking():
    assert verdict([{"class": "PRIVACY-SECRET RISK"}]) == "PUBLICATION_BLOCKED"
    assert verdict([{"class": "CONTENT ERROR"}]) == "PUBLICATION_BLOCKED"
    assert verdict([{"class": "CONTENT ERROR"}, {"class": "SUBTITLE ERROR"}]) == \
        "PUBLICATION_BLOCKED"
    assert verdict([{"class": "SUBTITLE ERROR"}]) == "NEEDS_FIX"
    assert verdict([{"class": "STALE SCREENSHOT"},
                    {"class": "TIMING-EDITORIAL ISSUE"}]) == "NEEDS_FIX"
    assert verdict([]) == "PASS"
    assert verdict(None) == "PASS"


def test_empty_report_does_not_crash():
    assert verify_media({}, INPUTS) == []
    assert verify_media(None, {}) == []
    assert verdict(verify_media({}, INPUTS)) == "PASS"


def test_finding_schema():
    report = clean_report()
    report["subtitles"][1]["text"] = "Growth was nine hundred percent this quarter."
    findings = verify_media(report, INPUTS)
    assert len(findings) == 1
    finding = findings[0]
    assert set(finding.keys()) == {"check", "class", "detail", "artifact"}
    assert finding["class"] in FINDING_CLASSES
    assert finding["check"] == "subtitle_numbers"


if __name__ == "__main__":
    tests = sorted(
        (name, fn) for name, fn in list(globals().items())
        if name.startswith("test_") and callable(fn)
    )
    for name, fn in tests:
        fn()
        print("ok -", name)
    print("all %d tests passed" % len(tests))
