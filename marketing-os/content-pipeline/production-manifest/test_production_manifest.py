"""Tests for the production manifest + render packet (idea #5).

Run:  python3 -m pytest   (in this directory)
  or:  python3 test_production_manifest.py
"""

import json

from manifest import (
    build_manifest,
    verify_manifest,
    sha256_hex,
)
from render_packet import build_render_packet

SCRIPT = b"INT. STUDIO - DAY\nToday we prove the pipeline. Deterministic hashes."
REC_TAMPERED = b"INT. STUDIO - DAY\nToday we improvised a lot and said new things!!!"


def _sample_inputs():
    return {
        "manifest_id": "man-001",
        "script_id": "script-042",
        "recording_id": "rec-042",
        "media_plan_id": "mp-042",
        "video_render_id": "vr-042",
        "thumbnail_id": "thumb-042",
        "duration_seconds": 615,
        "script": SCRIPT,
        "recording": b"RAW-RECORDING-BYTES-episode-42-take-3",
        "transcript": b"INT STUDIO DAY Today we prove the pipeline Deterministic hashes extra ad-lib",
        "video": b"VIDEO-RENDER-BYTES-1080p",
        "subtitles": b"1\n00:00:00,000 --> 00:00:02,000\nHello\n",
        "thumbnail": b"THUMBNAIL-PNG-BYTES",
        "fact_verification_status": "VERIFIED",
        "editorial_approval_status": "APPROVED",
        "media_approval_status": "APPROVED",
        "publication_approval_status": "PENDING",
    }


def _sample_script():
    return {
        "script_id": "script-042",
        "version": "v3",
        "editorial_approval_status": "APPROVED",
        "sections": [
            {"title": "Hook: determinism is a feature", "text": "Deterministic systems build trust."},
            {"title": "Evidence: the replay proof", "text": "We ran the same bytes twice and got the same hash 2 times."},
            {"title": "Counter: what about models", "text": "Models are execution metadata not meaning."},
            {"title": "Outro: go build", "text": "Build it and verify it."},
        ],
    }


def _sample_options():
    return {
        "voice": "nolan-clone-D",
        "style": "technical",
        "target_duration_seconds": 60.0,
        "aspect_ratios": ["16:9", "9:16"],
        "forbidden_visual_claims": [
            "Do not show a live system you did not capture.",
            "Do not render reconstruction as real footage.",
        ],
        "claim_bindings": {"Evidence: the replay proof": ["claim-7", "claim-9"]},
    }


def test_manifest_digests_verify_green():
    m = build_manifest(_sample_inputs())
    for key, artifact_key in [
        ("SCRIPT_DIGEST", "script"),
        ("RECORDING_DIGEST", "recording"),
        ("TRANSCRIPT_DIGEST", "transcript"),
        ("VIDEO_DIGEST", "video"),
        ("SUBTITLE_DIGEST", "subtitles"),
        ("THUMBNAIL_DIGEST", "thumbnail"),
    ]:
        assert m[key] == sha256_hex(_sample_inputs()[artifact_key]), key
    assert m["SCRIPT_ID"] == "script-042"
    assert m["DURATION"] == 615
    assert m["FACT_VERIFICATION_STATUS"] == "VERIFIED"
    assert m["EDITORIAL_APPROVAL_STATUS"] == "APPROVED"
    assert m["MEDIA_APPROVAL_STATUS"] == "APPROVED"
    assert m["PUBLICATION_APPROVAL_STATUS"] == "PENDING"

    result = verify_manifest(
        m,
        {
            "script": SCRIPT,
            "recording": _sample_inputs()["recording"],
            "transcript": _sample_inputs()["transcript"],
            "video": _sample_inputs()["video"],
            "subtitles": _sample_inputs()["subtitles"],
            "thumbnail": _sample_inputs()["thumbnail"],
        },
    )
    assert result["all_match"] is True, result
    assert all(
        v == "DIGEST_MATCH" for v in result["results"].values()
    ), result


def test_tampered_bytes_report_mismatch_naming_field():
    m = build_manifest(_sample_inputs())
    result = verify_manifest(
        m,
        {
            "script": SCRIPT,
            "recording": REC_TAMPERED,  # tampered
            "transcript": _sample_inputs()["transcript"],
            "video": _sample_inputs()["video"],
            "subtitles": _sample_inputs()["subtitles"],
            "thumbnail": _sample_inputs()["thumbnail"],
        },
    )
    assert result["all_match"] is False
    assert result["results"]["RECORDING_DIGEST"] == "DIGEST_MISMATCH"
    for key in (
        "SCRIPT_DIGEST",
        "TRANSCRIPT_DIGEST",
        "VIDEO_DIGEST",
        "SUBTITLE_DIGEST",
        "THUMBNAIL_DIGEST",
    ):
        assert result["results"][key] == "DIGEST_MATCH", key


def test_statuses_are_explicit_never_inferred():
    bad = _sample_inputs()
    bad["editorial_approval_status"] = "MAYBE"  # not an enum
    try:
        build_manifest(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for non-enum status")


def test_manifest_json_round_trip_is_deterministic():
    a = json.dumps(build_manifest(_sample_inputs()), sort_keys=True)
    b = json.dumps(build_manifest(_sample_inputs()), sort_keys=True)
    assert a == b


def test_render_packet_beats_cover_all_sections():
    packet = build_render_packet(_sample_script(), _sample_options())
    sections = _sample_script()["sections"]
    assert len(packet["beats"]) == len(sections)
    for i, (beat, section) in enumerate(zip(packet["beats"], sections)):
        assert beat["section_index"] == i
        assert beat["section_title"] == section["title"]
        assert beat["text"] == section["text"]
        assert beat["beat_id"] == "beat-%02d" % (i + 1)
    # every beat carries the required storyboard fields
    for beat in packet["beats"]:
        assert "visual_purpose" in beat and beat["visual_purpose"]
        assert isinstance(beat["factual_visuals_required"], list)
        assert isinstance(beat["generation_prompt"], str) and beat["generation_prompt"]
        assert beat["target_duration_seconds"] >= 3.0
    # durations are proportional and sum to the target
    total = sum(b["target_duration_seconds"] for b in packet["beats"])
    assert abs(total - 60.0) < 1e-9
    # beats are contiguous, in order
    assert packet["beats"][0]["starts_at_seconds"] == 0.0
    for prev, cur in zip(packet["beats"], packet["beats"][1:]):
        assert cur["starts_at_seconds"] == prev["ends_at_seconds"]


def test_forbidden_claims_preserved_verbatim():
    packet = build_render_packet(_sample_script(), _sample_options())
    assert packet["forbidden_visual_claims"] == [
        "Do not show a live system you did not capture.",
        "Do not render reconstruction as real footage.",
    ]


def test_packet_claim_bindings_and_gate():
    packet = build_render_packet(_sample_script(), _sample_options())
    evidence_beat = packet["beats"][1]
    assert evidence_beat["factual_visuals_required"] == ["claim-7", "claim-9"]
    assert packet["decision"] == "GO_GENERATE"
    assert packet["aspect_ratios"] == ["16:9", "9:16"]
    # non-approved scripts do not gate GENERATE
    pending = dict(_sample_script(), editorial_approval_status="PENDING")
    p2 = build_render_packet(pending, _sample_options())
    assert p2["decision"] == "NOT_GATED"


def test_packet_derivatives_and_determinism():
    packet = build_render_packet(_sample_script(), _sample_options())
    kinds = [d["kind"] for d in packet["derivative_opportunities"]]
    assert "thumbnail_concept" in kinds
    assert kinds.count("short_form_cut") == len(packet["beats"])
    assert any(
        d["kind"] == "pull_quote_graphic" and d["source_beat"] == "beat-02"
        for d in packet["derivative_opportunities"]
    )
    again = build_render_packet(_sample_script(), _sample_options())
    assert json.dumps(packet, sort_keys=True) == json.dumps(again, sort_keys=True)


if __name__ == "__main__":
    for name, fn in sorted(
        [(k, v) for k, v in globals().items() if k.startswith("test_")]
    ):
        fn()
        print("PASS", name)
    print("all tests passed")
