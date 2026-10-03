"""Unit tests for ingest_client.py: wire format, bearer handling, dry-run."""

import json
import sys

import pytest

from git_ingest.ingest_client import build_ingest_request, post_packet
from git_ingest.packet import GIT_COMMIT_OBSERVED


def _observation():
    envelope = {
        "sourceSystem": "git",
        "sourceAccount": "repo-1",
        "sourceObjectType": "commit",
        "sourceObjectId": "abc",
        "sourceVersion": "abc",
        "observedAt": "2026-10-02T00:00:00+00:00",
        "ingestedAt": "2026-10-02T00:00:00+00:00",
        "principal": "ping-git-ingest",
        "namespace": "core::git",
        "rawPayloadHash": "0" * 64,
        "sourceIdentity": "1" * 64,
    }
    return {
        "envelope": envelope,
        "eventType": GIT_COMMIT_OBSERVED,
        "payload": {"sha": "abc"},
        "logicalId": "1" * 64,
        "confidence": 0.95,
        "lifecycleStage": "observation",
    }


class TestBuildIngestRequest:
    def test_wire_format(self):
        req = build_ingest_request(
            "http://pig:8080", _observation(), bearer_key="sekret"
        )
        assert req["url"] == "http://pig:8080/ingest"
        assert req["headers"]["Content-Type"] == "application/json"
        assert req["headers"]["Authorization"] == "Bearer sekret"
        body = json.loads(req["body"])
        assert body["source"] == "git-ingest"
        assert body["eventType"] == GIT_COMMIT_OBSERVED
        assert body["payload"]["envelope"]["sourceSystem"] == "git"
        assert body["payload"]["observation"] == {"sha": "abc"}
        assert body["payload"]["principal"] == "ping-git-ingest"
        assert body["namespace"] == "core::git"
        assert body["logicalId"] == "1" * 64

    def test_bearer_never_in_body_or_url(self):
        req = build_ingest_request(
            "https://gw.example/", _observation(), bearer_key="topsecret"
        )
        assert req["url"] == "https://gw.example/ingest"
        assert "topsecret" not in req["body"]
        assert "topsecret" not in req["url"]

    def test_bearer_from_env(self, monkeypatch):
        monkeypatch.setenv("PING_INGEST_BEARER_KEY", "envkey")
        req = build_ingest_request("http://pig:8080", _observation())
        assert req["headers"]["Authorization"] == "Bearer envkey"

    def test_missing_bearer_raises(self, monkeypatch):
        monkeypatch.delenv("PING_INGEST_BEARER_KEY", raising=False)
        with pytest.raises(ValueError):
            build_ingest_request("http://pig:8080", _observation())

    def test_bad_gateway_url_rejected(self):
        with pytest.raises(ValueError):
            build_ingest_request("ssh://evil/x", _observation(), bearer_key="k")
        with pytest.raises(ValueError):
            build_ingest_request("", _observation(), bearer_key="k")

    def test_missing_event_type_rejected(self):
        obs = _observation()
        del obs["eventType"]
        with pytest.raises(ValueError):
            build_ingest_request("http://pig:8080", obs, bearer_key="k")


class FakePacket:
    def __init__(self, observations):
        self.observations = observations


class TestPostPacket:
    def test_dry_run_zero_network(self, monkeypatch):
        # Tripwire: if dry_run ever reaches for the network stack, the
        # import blows up (None in sys.modules halts the import).
        monkeypatch.setitem(sys.modules, "requests", None)
        result = post_packet(
            FakePacket([_observation(), _observation()]),
            "http://pig:8080",
            bearer_key="k",
            dry_run=True,
        )
        assert result["dry_run"] is True
        assert result["count"] == 2
        assert len(result["requests"]) == 2
        assert all(r["url"] == "http://pig:8080/ingest" for r in result["requests"])

    def test_live_post_uses_requests(self, monkeypatch):
        calls = []

        class FakeResp:
            status_code = 200
            ok = True

        def fake_post(url, headers=None, data=None, timeout=None):
            calls.append((url, headers, data))
            return FakeResp()

        import git_ingest.ingest_client as client_mod
        import sys, types

        fake_requests = types.SimpleNamespace(post=fake_post)
        monkeypatch.setitem(sys.modules, "requests", fake_requests)
        result = post_packet(
            FakePacket([_observation()]),
            "http://pig:8080",
            bearer_key="k",
            dry_run=False,
        )
        assert result["dry_run"] is False
        assert result["results"] == [{"status": 200, "ok": True}]
        assert calls[0][0] == "http://pig:8080/ingest"
