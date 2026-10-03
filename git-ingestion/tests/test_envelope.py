"""Unit tests for envelope.py: identity rule and TS field parity."""

import hashlib
import json

import pytest

from git_ingest import config
from git_ingest.envelope import (
    build_envelope,
    envelope_leaks_secret_material,
    source_identity,
)


def test_source_identity_rule():
    got = source_identity("git-ingest", "repo:abc", "deadbeef", "deadbeef")
    want = hashlib.sha256(b"git-ingest|repo:abc|deadbeef|deadbeef").hexdigest()
    assert got == want


def test_source_identity_distinguishes_versions():
    a = source_identity("c", "s", "o", "v1")
    b = source_identity("c", "s", "o", "v2")
    assert a != b


def test_build_envelope_field_names():
    env = build_envelope(
        stream_id="repo:abc",
        source_account="abc",
        source_object_type="commit",
        source_object_id="deadbeef",
        source_version="deadbeef",
        raw_payload=b"raw-bytes",
        observed_at="2026-10-02T00:00:00+00:00",
        ingested_at="2026-10-02T00:00:01+00:00",
    )
    assert env["sourceSystem"] == "git"
    assert env["sourceAccount"] == "abc"
    assert env["sourceObjectType"] == "commit"
    assert env["sourceObjectId"] == "deadbeef"
    assert env["sourceVersion"] == "deadbeef"
    assert env["observedAt"] == "2026-10-02T00:00:00+00:00"
    assert env["ingestedAt"] == "2026-10-02T00:00:01+00:00"
    assert env["principal"] == config.PRINCIPAL
    assert env["namespace"] == config.NAMESPACE
    assert env["rawPayloadHash"] == hashlib.sha256(b"raw-bytes").hexdigest()
    assert env["sourceIdentity"] == source_identity(
        "git-ingest", "repo:abc", "deadbeef", "deadbeef"
    )
    assert "cursor" not in env
    # Raw payload bytes are hashed, never stored.
    assert b"raw-bytes" not in json.dumps(env).encode()


def test_source_version_fallback():
    env = build_envelope(
        stream_id="s",
        source_account="a",
        source_object_type="ref",
        source_object_id="refs/heads/main",
        raw_payload=b"xyz",
    )
    assert env["sourceVersion"] == "payload-sha256:" + hashlib.sha256(b"xyz").hexdigest()


def test_cursor_echo():
    env = build_envelope(
        stream_id="s",
        source_account="a",
        source_object_type="ref",
        source_object_id="r",
        raw_payload=b"xyz",
        cursor={"tip": "abc"},
    )
    assert env["cursor"] == {"tip": "abc"}


def test_required_fields_rejected():
    with pytest.raises(ValueError):
        build_envelope(
            stream_id="",
            source_account="a",
            source_object_type="ref",
            source_object_id="r",
            raw_payload=b"xyz",
        )
    with pytest.raises(ValueError):
        build_envelope(
            stream_id="s",
            source_account="a",
            source_object_type="ref",
            source_object_id="r",
            raw_payload=b"",
        )


def test_no_secret_material():
    env = build_envelope(
        stream_id="s",
        source_account="a",
        source_object_type="commit",
        source_object_id="o",
        raw_payload=b"data",
    )
    assert envelope_leaks_secret_material(env, ["bearer", "token", "secret"]) == []
