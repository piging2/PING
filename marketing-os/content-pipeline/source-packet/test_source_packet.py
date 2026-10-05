"""Cheapest relevant tests for the source-packet builder + validator.

Runs under pytest if available, otherwise directly as a script
(python3 test_source_packet.py) via the plain-assert runner below.
"""

from packet import build_packet, validate_packet, CLAIM_STATES, SECTIONS


def full_research():
    return {
        "thesis": "Home-service owners ignore AI until the phone rings unanswered.",
        "why_now": "Labor shortage peaked Q3 2026; missed-call volume up 40%.",
        "audience": {
            "who": "HVAC/plumbing owners, 5-30 employees, owner-operated",
            "sophistication": "uses smartphones, has heard of ChatGPT, never deployed automation",
        },
        "evidence": {
            "primary": ["30-day call log from operator A: 22% calls missed"],
            "independent": ["BBB complaint corpus: response-time complaints"],
            "weaker": ["industry survey n=87 on after-hours calls"],
            "contradictions": ["operator B claims missed calls are 'not a real problem'"],
        },
        "interesting_observations": [
            "Owners track missed calls obsessively but do nothing about them.",
            "The shops with the best vans have the worst phone habits.",  # does not fit narrative
        ],
        "possible_arguments": [
            "Missed calls are the highest-ROI automation entry point.",
            "Speed of response beats quality of response in trades.",
        ],
        "counterargument": "The best shops stay booked via reputation and referrals; missed calls may simply select for price-shoppers they do not want.",
        "unknowns": [
            "Actual revenue lost per missed call (no shop measures this).",
            "Whether after-hours callers convert at all.",
        ],
        "firsthand_evidence": [
            {"kind": "call_log", "source": "operator A", "window": "30 days"}
        ],
        "demonstrations_available": [
            {"kind": "live_call_demo", "needs": "test phone number"}
        ],
        "hook_candidates": [
            "Your phone rang 12 times this week. You picked up 9.",
        ],
        "narrative_candidates": [
            {"name": "The silent phone", "arc": "missed calls as invisible leak", "notes": ""},
            {"name": "Speed wins", "arc": "response time as the whole brand", "notes": ""},
            {"name": "The owner's blind spot", "arc": "what owners track vs fix", "notes": ""},
        ],
        "claim_matrix": [
            {"claim": "22% of calls missed", "state": "CONFIRMED", "note": "operator A log"},
            {"claim": "missed calls cost $X", "state": "UNCLEAR", "note": "no measurement"},
            {"claim": "callers prefer humans", "state": "REFUTED", "note": "survey says bot ok"},
        ],
        "visual_opportunities": [
            {"idea": "phone ringing on empty desk", "purpose": "HOOK"}
        ],
        "source_material": [
            {
                "title": "operator A call log",
                "retrieved_at": "2026-10-04T18:00:00-06:00",
                "source_uri": "file://operator-a/call-log-30d.csv",
                "content_hash": "sha256:abc123",
            },
            {
                "title": "BBB complaints",
                "retrieved_at": "2026-10-04T18:05:00-06:00",
                "source_uri": "https://example.org/bbb-corpus",
                "content_hash": "sha256:def456",
            },
        ],
    }


def test_full_research_yields_all_sections_and_validates_clean():
    packet = build_packet(full_research())
    assert set(packet.keys()) == set(SECTIONS), "packet must have exactly all sections"
    findings = validate_packet(packet)
    assert findings == [], "full packet should validate clean, got: %r" % (findings,)


def test_validation_flags_missing_counterargument():
    packet = build_packet(full_research())
    packet["counterargument"] = ""  # dropped by a later stage
    findings = validate_packet(packet)
    codes = {(f["code"], f["section"]) for f in findings}
    assert ("WEAK_COUNTERARGUMENT", "counterargument") in codes, codes
    assert ("EMPTY_SECTION", "counterargument") in codes, codes


def test_validation_flags_source_without_provenance():
    packet = build_packet(full_research())
    packet["source_material"] = [
        {"title": "mystery screenshot", "source_uri": "https://example.org/img.png"}
        # missing retrieved_at and content_hash
    ]
    findings = validate_packet(packet)
    prov = [f for f in findings if f["code"] == "MISSING_PROVENANCE"]
    assert len(prov) == 1, findings
    assert "retrieved_at" in prov[0]["detail"] and "content_hash" in prov[0]["detail"]


def test_validation_flags_fewer_than_two_narratives():
    packet = build_packet(full_research())
    packet["narrative_candidates"] = packet["narrative_candidates"][:1]
    findings = validate_packet(packet)
    assert any(
        f["code"] == "TOO_FEW_NARRATIVES" for f in findings
    ), findings


def test_claim_matrix_states_restricted_to_three():
    assert set(CLAIM_STATES) == {"CONFIRMED", "REFUTED", "UNCLEAR"}
    packet = build_packet(full_research())
    packet["claim_matrix"] = [
        {"claim": "something", "state": "PROVEN", "note": ""},  # invalid state
    ]
    findings = validate_packet(packet)
    assert any(
        f["code"] == "INVALID_CLAIM_STATE" for f in findings
    ), findings


def test_build_deterministic_and_total():
    r1 = build_packet(full_research())
    r2 = build_packet(full_research())
    assert r1 == r2, "build_packet must be deterministic"
    # empty input yields all sections, never raises
    empty = build_packet({})
    assert set(empty.keys()) == set(SECTIONS)
    assert validate_packet({}) != [], "empty dict must produce findings"
    assert validate_packet(None) != [], "None must produce findings"


if __name__ == "__main__":
    test_full_research_yields_all_sections_and_validates_clean()
    test_validation_flags_missing_counterargument()
    test_validation_flags_source_without_provenance()
    test_validation_flags_fewer_than_two_narratives()
    test_claim_matrix_states_restricted_to_three()
    test_build_deterministic_and_total()
    print("all source-packet tests passed")
