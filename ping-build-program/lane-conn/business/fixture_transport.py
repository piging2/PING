"""Fixture HTTP transport for the GBP connector spike.

Reads a recorded exchange file (recording.jsonl): each line is
{"request": {...}, "response": {...}}. Requests match on method+path+query,
plus an optional call_index for sequencing repeated identical requests
(rec-d-429, rec-f-304). This is the connector-lab fixture format proposed for
lane R: verbatim request/response pairs with a scenario manifest header line.

FIXTURE MODE ONLY. Nothing here touches a live provider. A production
transport implementing the same HttpTransport interface swaps in behind
gbp_connector.GbpConnector without changing the connector.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class HttpResponse:
    status: int
    headers: dict
    body: Any  # parsed JSON or None


class HttpTransport:
    def request(self, method: str, path: str, query: Optional[dict] = None,
                headers: Optional[dict] = None) -> HttpResponse:
        raise NotImplementedError


class FixtureTransport(HttpTransport):
    """Replays a recording.jsonl. Tracks every attempt for retry-storm audits."""

    def __init__(self, recording_path: str):
        self.recording_path = recording_path
        self._exchanges: list = []
        self._manifest: dict = {}
        self.attempt_log: list = []  # {"method","path","query","headers","call_index"}
        with open(recording_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                if "request" not in entry and "response" not in entry:
                    self._manifest = entry  # scenario header line
                    continue
                self._exchanges.append(entry)

    @property
    def manifest(self) -> dict:
        return dict(self._manifest)

    def _match(self, method: str, path: str, query: dict, headers: dict,
               call_index: int) -> Optional[dict]:
        for ex in self._exchanges:
            req = ex["request"]
            if req.get("method") != method or req.get("path") != path:
                continue
            if (req.get("query") or {}) != (query or {}):
                continue
            want_index = req.get("call_index")
            if want_index is not None and want_index != call_index:
                continue
            if want_index is None and any("call_index" in e["request"] for e in self._exchanges
                                          if e["request"].get("method") == method
                                          and e["request"].get("path") == path):
                # this request shape has indexed variants; unindexed must not match
                continue
            hdr_want = {k.lower(): v for k, v in (req.get("headers") or {}).items()}
            hdr_got = {k.lower(): v for k, v in (headers or {}).items()}
            if any(hdr_got.get(k) != v for k, v in hdr_want.items()):
                continue
            return ex
        return None

    def request(self, method: str, path: str, query: Optional[dict] = None,
                headers: Optional[dict] = None) -> HttpResponse:
        query = query or {}
        headers = headers or {}
        prior = sum(1 for a in self.attempt_log
                    if a["method"] == method and a["path"] == path
                    and a["query"] == query)
        self.attempt_log.append({"method": method, "path": path,
                                 "query": query, "headers": headers,
                                 "call_index": prior})
        ex = self._match(method, path, query, headers, prior)
        if ex is None:
            raise AssertionError(
                f"fixture has no recorded exchange for {method} {path} "
                f"query={query} headers={headers} (call #{prior}); "
                f"a connector must never invent a response")
        resp = ex["response"]
        return HttpResponse(status=resp["status"],
                            headers={k.lower(): v for k, v in (resp.get("headers") or {}).items()},
                            body=resp.get("body"))
