"""Transport layer: read-only HTTP access to the GitHub REST API.

The only production transport is UrlLibTransport, which performs plain
HTTPS GETs against https://api.github.com. Authentication, when used, is
attached by an AuthHook (see auth.py) and never by embedding secrets in
URLs, headers built by hand, or code constants.

ScriptedTransport is a test-only transport: it replays a pre-written
script of responses and failures so kill tests, rate-limit tests, and
concurrency tests exercise the real orchestrator without touching the
network. It is never used in production paths.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple


class TransportError(Exception):
    """A fetch failed for a reason that is not a rate limit."""


class RateLimited(TransportError):
    """GitHub signalled a rate limit (429, or 403 with remaining=0).

    This is a stop condition, not a retry condition. The orchestrator
    must persist its checkpoint and return a RATE_LIMITED state; it must
    not retry the failed request blindly.
    """

    def __init__(self, reset_epoch: Optional[int] = None,
                 retry_after: Optional[int] = None,
                 remaining: Optional[int] = None):
        self.reset_epoch = reset_epoch
        self.retry_after = retry_after
        self.remaining = remaining
        super().__init__(
            "rate limited (stop, do not retry blindly): "
            f"reset_epoch={reset_epoch} retry_after={retry_after} "
            f"remaining={remaining}"
        )


class NotFound(TransportError):
    """The resource does not exist (404). Used for stale-checkpoint recovery."""


@dataclass
class Response:
    status: int
    headers: Dict[str, str]
    body: Any


def _normalize_headers(raw) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for k, v in raw.items():
        out[k.lower()] = v
    return out


def raise_for_rate_limit(status: int, headers: Dict[str, str]) -> None:
    """Raise RateLimited when the response signals exhaustion; NotFound on 404."""
    if status == 404:
        raise NotFound("github resource not found")
    remaining = headers.get("x-ratelimit-remaining")
    if status == 429 or (status == 403 and remaining == "0"):
        reset = headers.get("x-ratelimit-reset")
        retry_after = headers.get("retry-after")
        raise RateLimited(
            reset_epoch=int(reset) if reset and reset.isdigit() else None,
            retry_after=int(retry_after) if retry_after and retry_after.isdigit() else None,
            remaining=int(remaining) if remaining and remaining.isdigit() else None,
        )
    if status >= 400:
        raise TransportError(f"github returned http {status}")


class Transport:
    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Response:
        raise NotImplementedError


class UrlLibTransport(Transport):
    """Production transport. Read-only GETs only. No POST/PUT/DELETE methods exist."""

    API_BASE = "https://api.github.com"

    def __init__(self, auth: Optional["AuthHook"] = None,
                 timeout: float = 30.0,
                 user_agent: str = "ping-git-ingest/1.0"):
        self.auth = auth
        self.timeout = timeout
        self.user_agent = user_agent

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Response:
        url = self.API_BASE + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, method="GET")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("User-Agent", self.user_agent)
        if self.auth is not None:
            self.auth.attach(req)
        try:
            resp = urllib.request.urlopen(req, timeout=self.timeout)
            body = json.loads(resp.read().decode("utf-8", errors="replace"))
            headers = _normalize_headers(resp.headers)
            return Response(status=resp.status, headers=headers, body=body)
        except urllib.error.HTTPError as e:
            headers = _normalize_headers(e.headers or {})
            raise_for_rate_limit(e.code, headers)


# ---------------------------------------------------------------------------
# Test-only scripted transport
# ---------------------------------------------------------------------------

ScriptStep = Tuple[str, Any]  # ("response", (status, headers, body)) | ("raise", exc)


class ScriptedTransport(Transport):
    """Replays a script. Steps: ("response", (status, headers, body))
    or ("raise", exception_instance). Asserts no blind retries: every get()
    consumes exactly one scripted step.

    Records every call in `calls` for assertions about retry counts.
    """

    def __init__(self, steps: List[ScriptStep]):
        self._steps = list(steps)
        self.calls: List[Tuple[str, Optional[Dict[str, Any]]]] = []

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Response:
        self.calls.append((path, params))
        if not self._steps:
            raise AssertionError("script exhausted: no more scripted steps")
        kind, payload = self._steps.pop(0)
        if kind == "raise":
            raise payload
        status, headers, body = payload
        norm = {k.lower(): str(v) for k, v in headers.items()}
        raise_for_rate_limit(status, norm)
        return Response(status=status, headers=norm, body=body)

    def remaining(self) -> int:
        return len(self._steps)
