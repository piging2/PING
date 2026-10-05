"""Production manifest generator (MarketingOS content pipeline, idea #5a).

A production manifest is created AFTER recording. It binds the script, the actual
recording (people improvise), transcript, media plan, video render, subtitles,
thumbnail, and the three approval statuses into one tamper-evident record.

All functions are pure and deterministic over dict/JSON inputs. Stdlib only.
No network, no DB, no new authorities.

Approval statuses are explicit input enums; they are NEVER inferred by this module.
"""

import hashlib

MANIFEST_VERSION = "1"

# Digest-bearing artifact fields. Each maps manifest digest key -> artifact key
# used in the artifacts dict for build/verify.
DIGEST_FIELDS = {
    "SCRIPT_DIGEST": "script",
    "RECORDING_DIGEST": "recording",
    "TRANSCRIPT_DIGEST": "transcript",
    "VIDEO_DIGEST": "video",
    "SUBTITLE_DIGEST": "subtitles",
    "THUMBNAIL_DIGEST": "thumbnail",
}

# Explicit approval-state enums. Statuses are inputs, never inferred.
FACT_VERIFICATION_STATES = frozenset(
    {"VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "FAILED", "NOT_APPLICABLE"}
)
APPROVAL_STATES = frozenset(
    {"APPROVED", "CHANGES_REQUESTED", "REJECTED", "PENDING", "WAIVED"}
)


def sha256_hex(data: bytes) -> str:
    """Deterministic sha256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def _resolve_bytes(value):
    """Accept bytes directly, a filesystem path (str), or a dict with
    'bytes' or 'path' keys. Returns raw bytes. Deterministic."""
    if isinstance(value, bytes):
        return value
    if isinstance(value, bytearray):
        return bytes(value)
    if isinstance(value, str):
        with open(value, "rb") as fh:
            return fh.read()
    if isinstance(value, dict):
        if "bytes" in value:
            b = value["bytes"]
            return bytes(b) if isinstance(b, bytearray) else b
        if "path" in value:
            with open(value["path"], "rb") as fh:
                return fh.read()
    raise TypeError(
        "artifact must be bytes, a path string, or a dict with 'bytes'/'path'"
    )


def _validate_status(value, allowed, field_name):
    if value not in allowed:
        raise ValueError(
            "invalid %s %r; must be one of %s"
            % (field_name, value, sorted(allowed))
        )
    return value


def script_transcript_word_diff(script_bytes, transcript_bytes):
    """Cheapest deterministic script <-> actual-recording check.

    Compares script words vs transcript words (case-folded, whitespace-split).
    Returns a small summary dict. A richer semantic diff (numbers, proper
    nouns, qualifiers removed, new claims) belongs to idea #4's edit
    classifier; this stays a pure byte/word gate here.
    """
    script_words = script_bytes.decode("utf-8", errors="replace").lower().split()
    transcript_words = transcript_bytes.decode("utf-8", errors="replace").lower().split()
    script_set = set(script_words)
    transcript_set = set(transcript_words)
    common = script_set & transcript_set
    omitted = sorted(script_set - transcript_set)
    added = sorted(transcript_set - script_set)
    return {
        "method": "word_set_diff",
        "script_word_count": len(script_words),
        "transcript_word_count": len(transcript_words),
        "shared_unique_words": len(common),
        "omitted_from_recording": omitted,
        "added_in_recording": added,
        "recording_word_ratio": (
            round(len(transcript_words) / len(script_words), 3)
            if script_words
            else 0.0
        ),
    }


def build_manifest(inputs):
    """Assemble the production manifest dict.

    inputs keys (required unless noted):
      script_id, recording_id, media_plan_id, video_render_id, thumbnail_id,
      duration_seconds,
      script / recording / transcript / video / subtitles / thumbnail
        -> bytes | path str | {"bytes"|"path"} (artifacts to digest)
      fact_verification_status        (explicit enum)
      editorial_approval_status       (explicit enum)
      media_approval_status           (explicit enum)
      publication_approval_status     (explicit enum)
      script_transcript_diff (optional): explicit diff record; if omitted and
        both script and transcript bytes are present, a deterministic word-set
        diff is computed.
      manifest_id (optional): external identifier for this manifest record.

    Every artifact byte stream is hashed with sha256. The manifest never
    invents or upgrades a status.
    """
    required = [
        "script_id",
        "recording_id",
        "media_plan_id",
        "video_render_id",
        "thumbnail_id",
        "duration_seconds",
        "fact_verification_status",
        "editorial_approval_status",
        "media_approval_status",
        "publication_approval_status",
    ]
    missing = [k for k in required if k not in inputs]
    if missing:
        raise ValueError("build_manifest missing inputs: %s" % missing)

    artifact_bytes = {}
    for artifact_key in DIGEST_FIELDS.values():
        if artifact_key not in inputs:
            raise ValueError(
                "build_manifest missing artifact bytes for %r" % artifact_key
            )
        artifact_bytes[artifact_key] = _resolve_bytes(inputs[artifact_key])

    digests = {
        digest_key: sha256_hex(artifact_bytes[artifact_key])
        for digest_key, artifact_key in DIGEST_FIELDS.items()
    }

    diff = inputs.get("script_transcript_diff")
    if diff is None:
        diff = script_transcript_word_diff(
            artifact_bytes["script"], artifact_bytes["transcript"]
        )

    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "manifest_id": inputs.get("manifest_id"),
        "SCRIPT_ID": inputs["script_id"],
        "SCRIPT_DIGEST": digests["SCRIPT_DIGEST"],
        "RECORDING_ID": inputs["recording_id"],
        "RECORDING_DIGEST": digests["RECORDING_DIGEST"],
        "DURATION": inputs["duration_seconds"],
        "TRANSCRIPT_DIGEST": digests["TRANSCRIPT_DIGEST"],
        "SCRIPT_TRANSCRIPT_DIFF": diff,
        "MEDIA_PLAN_ID": inputs["media_plan_id"],
        "VIDEO_RENDER_ID": inputs["video_render_id"],
        "VIDEO_DIGEST": digests["VIDEO_DIGEST"],
        "SUBTITLE_DIGEST": digests["SUBTITLE_DIGEST"],
        "THUMBNAIL_ID": inputs["thumbnail_id"],
        "THUMBNAIL_DIGEST": digests["THUMBNAIL_DIGEST"],
        "FACT_VERIFICATION_STATUS": _validate_status(
            inputs["fact_verification_status"],
            FACT_VERIFICATION_STATES,
            "fact_verification_status",
        ),
        "EDITORIAL_APPROVAL_STATUS": _validate_status(
            inputs["editorial_approval_status"],
            APPROVAL_STATES,
            "editorial_approval_status",
        ),
        "MEDIA_APPROVAL_STATUS": _validate_status(
            inputs["media_approval_status"], APPROVAL_STATES, "media_approval_status"
        ),
        "PUBLICATION_APPROVAL_STATUS": _validate_status(
            inputs["publication_approval_status"],
            APPROVAL_STATES,
            "publication_approval_status",
        ),
    }
    return manifest


def verify_manifest(manifest, artifacts):
    """Re-hash supplied artifact bytes and compare against the manifest.

    artifacts: dict mapping artifact key ('script', 'recording', 'transcript',
    'video', 'subtitles', 'thumbnail') -> bytes | path | {"bytes"|"path"}.

    Returns {"results": {digest_key: "DIGEST_MATCH"|"DIGEST_MISMATCH"|
    "ARTIFACT_NOT_PROVIDED"}, "all_match": bool}.
    """
    results = {}
    for digest_key, artifact_key in DIGEST_FIELDS.items():
        expected = manifest.get(digest_key)
        if artifact_key not in artifacts:
            results[digest_key] = "ARTIFACT_NOT_PROVIDED"
            continue
        actual = sha256_hex(_resolve_bytes(artifacts[artifact_key]))
        results[digest_key] = (
            "DIGEST_MATCH" if actual == expected else "DIGEST_MISMATCH"
        )
    all_match = all(v == "DIGEST_MATCH" for v in results.values())
    return {"results": results, "all_match": all_match}
