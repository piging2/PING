#!/usr/bin/env python3
"""Shared request envelope for the skill-creator bin CLIs.

Covers ONLY the duplicated envelope across
skills/{github,typesafe,vercel,x-api}/bin/*.py:
  - host allowlist check
  - surrogate credential attach
  - JSON (or raw) response read
  - typed HTTP errors, with the skill docs' "a 401 is a question about
    the request" rule encoded as a hint on 401/403

Per-CLI concerns stay in the CLIs: credential name, host, base URL,
extra headers, endpoint shapes, timeouts, output formatting, auth
retrieval mechanism (xapi.py keeps its own authdc-based surrogate
flow), and all write semantics.

Location note: the intended home is /opt/hatch/skills/skill-creator/bin,
but /opt is a read-only mount on this host, so this module lives in a
workspace mirror of skill-creator/bin. CLIs insert this directory on
sys.path first; dynamic_credentials is still imported from the bundled
/opt path.
"""
from __future__ import annotations

import sys
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")

from dynamic_credentials import (  # noqa: E402
    DynamicCredentialError,
    add_surrogate_to_request,
    ensure_allowed_url,
    read_json_response,
    read_response_body,
)

__all__ = [
    "ApiRequestError",
    "AUTH_QUESTION_STATUSES",
    "AUTH_QUESTION_HINT",
    "api_call",
]

#: Statuses the skill docs treat as "a question about the request before
#: it is a question about the key".
AUTH_QUESTION_STATUSES = (401, 403)

AUTH_QUESTION_HINT = (
    "Per the skill docs: a 401/403 is a question about the request before "
    "it is a question about the key. First confirm the request actually "
    "carried the credential - a request built without the shared helpers "
    "carries nothing, which looks exactly like a wrong or under-scoped "
    "token. Only then consider reconnecting the credential."
)


class ApiRequestError(RuntimeError):
    """A provider API call failed with an HTTP error status."""

    def __init__(self, status: int, body: bytes):
        self.status = status
        self.body = body  # raw bytes, exactly as read from the error response
        self.detail = body.decode("utf-8", errors="replace")
        super().__init__(f"HTTP {status}: {self.detail}")

    @property
    def is_auth_question(self) -> bool:
        return self.status in AUTH_QUESTION_STATUSES

    def auth_hint(self) -> str | None:
        return AUTH_QUESTION_HINT if self.is_auth_question else None


def api_call(
    method: str,
    url: str,
    *,
    credential: str | None = None,
    entry_name: str = "access_token",
    allowed_hosts,
    extra_headers: dict | None = None,
    data: bytes | None = None,
    timeout: float = 30,
    response_format: str = "json",
):
    """Execute one authenticated provider API call.

    Returns (status, parsed) where parsed is the JSON-decoded body for
    response_format="json" or the decoded text body for "raw".

    When credential is given, its surrogate is attached via
    add_surrogate_to_request. Pass credential=None when the caller
    attaches its own Authorization header (xapi.py keeps its own
    authdc-based surrogate flow).

    Raises ApiRequestError on HTTP errors (with the raw error body
    preserved for caller formatting); DynamicCredentialError and
    URLError propagate untouched, exactly as the CLIs behaved before.
    """
    ensure_allowed_url(url, allowed_hosts)

    req = urllib.request.Request(url, data=data, method=method)
    for name, value in (extra_headers or {}).items():
        req.add_header(name, value)

    if credential is not None:
        add_surrogate_to_request(
            req, credential, entry_name=entry_name, allowed_hosts=allowed_hosts
        )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if response_format == "raw":
                return resp.status, read_response_body(resp).decode()
            if response_format == "json":
                return resp.status, read_json_response(resp)
            raise ValueError(f"unknown response_format: {response_format!r}")
    except urllib.error.HTTPError as e:
        raise ApiRequestError(e.code, read_response_body(e)) from e
