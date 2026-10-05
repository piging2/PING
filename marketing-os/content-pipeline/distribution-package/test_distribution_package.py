"""Cheapest relevant tests for the distribution-package builder.

Runs under pytest if available, otherwise directly as a script
(python3 test_distribution_package.py) via the plain-assert runner below.
"""

from package import (
    build_package,
    build_cut_candidates,
    validate_package,
    ledger_claim_ids,
    SHORT_CUT_MIN_S,
    SHORT_CUT_MAX_S,
    OBSERVATION_WINDOW_DAYS,
)


def full_master():
    return {
        "master_id": "master-007",
        "digest": "sha256:abc123",
        "duration_s": 900,
        "transcript": "Approved master transcript.",
        "semantic_moments": [
            {"id": "m1", "t_start": 5, "t_end": 30, "label": "missed calls cost revenue", "claim_ids": ["c1"]},
            {"id": "m2", "t_start": 60, "t_end": 200, "label": "AI answering walkthrough", "claim_ids": ["c2", "c3"]},
            {"id": "m3", "t_start": 300, "t_end": 304, "label": "too short bumper", "claim_ids": ["c1"]},  # 4s: excluded
            {"id": "m4", "t_start": 400, "t_end": 700, "label": "deep dive interview", "claim_ids": ["c3"]},  # 300s: excluded
        ],
        "claim_ledger_ref": {
            "claims": {
                "c1": {"evidence_refs": ["ev-1"]},
                "c2": {"evidence_refs": ["ev-2", "ev-3"]},
                "c3": {"evidence_refs": []},
            }
        },
    }


def destinations():
    return [
        {"platform": "youtube", "aspect": "horizontal", "max_title_len": 100, "max_caption_len": 5000, "audience": "home-service owners"},
        {"platform": "tiktok", "aspect": "vertical", "max_title_len": 150, "max_caption_len": 2200, "audience": "trade owners"},
        {"platform": "instagram-reels", "aspect": "vertical", "max_title_len": 150, "max_caption_len": 2200, "audience": "trade owners"},
    ]


def test_package_covers_all_destinations():
    pkg = build_package(full_master(), destinations())
    assert len(pkg["destinations"]) == 3
    assert [d["platform"] for d in pkg["destinations"]] == ["youtube", "tiktok", "instagram-reels"]
    for d in pkg["destinations"]:
        assert len(d["title_variants"]) == 3
        assert len(d["hook_variants"]) == 3
        assert len(d["cta_variants"]) == 3
        assert len(d["thumbnail_concepts"]) == 2
        assert d["caption"]["text"]
        assert d["framing"]["text"]


def test_cut_candidates_only_from_semantic_moments_within_bounds():
    ledger_ids = ledger_claim_ids(full_master())
    cuts = build_cut_candidates(full_master(), ledger_ids)
    moment_ids = {m["id"] for m in full_master()["semantic_moments"]}
    assert cuts, "expected at least one cut candidate"
    for cut in cuts:
        assert cut["moment_id"] in moment_ids, "cut must cite a semantic moment"
        assert SHORT_CUT_MIN_S <= cut["duration_s"] <= SHORT_CUT_MAX_S
        assert cut["t_end"] - cut["t_start"] == cut["duration_s"]
        assert set(cut["claim_ids"]) <= ledger_ids
    got = {c["moment_id"] for c in cuts}
    assert got == {"m1"}, f"expected only m1 (25s) in bounds, got {got}"


def test_title_lengths_respected():
    pkg = build_package(full_master(), destinations())
    for dest, spec in zip(pkg["destinations"], destinations()):
        for unit in dest["title_variants"]:
            assert len(unit["text"]) <= spec["max_title_len"], f"title too long: {unit['text']!r}"
        assert len(dest["caption"]["text"]) <= spec["max_caption_len"]


def test_unknown_claim_id_in_caption_raises():
    master = full_master()
    pkg = build_package(master, destinations())
    pkg["destinations"][0]["caption"]["claim_ids"].append("c-ghost")
    try:
        validate_package(pkg, master)
    except ValueError as e:
        assert "UNKNOWN_CLAIM_ID" in str(e)
        assert "c-ghost" in str(e)
    else:
        raise AssertionError("unknown claim id in caption did not raise")


def test_unknown_claim_id_in_cut_candidate_raises():
    master = full_master()
    pkg = build_package(master, destinations())
    pkg["cut_candidates"][0]["claim_ids"].append("c-phantom")
    try:
        validate_package(pkg, master)
    except ValueError as e:
        assert "UNKNOWN_CLAIM_ID" in str(e)
    else:
        raise AssertionError("unknown claim id in cut candidate did not raise")


def test_observation_window_present():
    pkg = build_package(full_master(), destinations())
    assert pkg["publication_proposal"]["observation_window_days"] == OBSERVATION_WINDOW_DAYS
    assert pkg["publication_proposal"]["metrics"]
    assert pkg["publication_proposal"]["experiment_metadata"]["arms"]
    assert pkg["monitoring_plan"]["window_days"] == OBSERVATION_WINDOW_DAYS
    assert pkg["monitoring_plan"]["checks"]


def test_chaptering_long_form_only():
    pkg = build_package(full_master(), destinations())
    yt = pkg["destinations"][0]
    assert yt["format"] == "long-form"
    assert yt["chaptering"]["chapters"]
    assert {c["moment_id"] for c in yt["chaptering"]["chapters"]} == {"m1", "m2", "m3", "m4"}
    for d in pkg["destinations"][1:]:
        assert d["format"] == "short-form"
        assert "chaptering" not in d


def test_evidence_appendix_passthrough():
    pkg = build_package(full_master(), destinations())
    assert pkg["evidence_appendix"] == {"c1": ["ev-1"], "c2": ["ev-2", "ev-3"], "c3": []}


def test_claim_omission_is_allowed():
    # A unit citing a SUBSET of ledger claims must validate fine.
    master = full_master()
    pkg = build_package(master, destinations())
    pkg["destinations"][1]["caption"]["claim_ids"] = []
    validate_package(pkg, master)


def test_master_without_digest_fails_reverification():
    master = full_master()
    del master["digest"]
    try:
        build_package(master, destinations())
    except ValueError as e:
        assert "MISSING_DIGEST" in str(e)
    else:
        raise AssertionError("master without digest did not fail re-verification")


def test_deterministic():
    a = build_package(full_master(), destinations())
    b = build_package(full_master(), destinations())
    assert a == b


# Plain-assert runner for environments without pytest.
if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"PASS {t.__name__}")
    print(f"{len(tests)} tests passed")
