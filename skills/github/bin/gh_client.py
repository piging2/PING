#!/usr/bin/env python3
"""GitHub connector module.

A typed, honest client for api.github.com using the user-connected
``custom.github`` credential. Raw credentials are never printed, logged,
or persisted -- only ``hsurr:*`` surrogate values leave this process via
the dynamic credential helpers.

Usage:
    from gh_client import GitHubClient, GhNotFoundError

    client = GitHubClient()
    print(client.me()["login"])          # read path, works on the current grant
    for repo in client.paginate("/user/repos"):
        print(repo["full_name"])
    try:
        client.get("/repos/does-not-exist-xyz/none")
    except GhNotFoundError as e:
        print(e.http_status)             # -> 404
"""

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import (
    add_surrogate_to_request,
    ensure_allowed_url,
    read_json_response,
    read_response_body,
)

HOST = "api.github.com"
BASE = f"https://{HOST}"
CRED = "custom.github"

HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


class GhApiError(RuntimeError):
    """Base for all GitHub connector errors. Never fabricates success."""

    def __init__(self, message, *, http_status=None, retry_after=None,
                 rate_reset=None):
        super().__init__(message)
        self.http_status = http_status
        # Seconds until the primary rate limit resets (epoch time), when known.
        self.rate_reset = rate_reset
        # Seconds to wait before retrying a secondary rate limit, when known.
        self.retry_after = retry_after


class GhAuthError(GhApiError):
    """401: the token is missing, invalid, or expired.

    Per the skill: a 401 is first a question about the request (was the
    credential attached at all?). This error means a request that DID carry
    the credential was still rejected.
    """


class GhForbiddenError(GhApiError):
    """403 without rate-limit exhaustion: the grant lacks scope or the
    resource is off-limits."""


class GhNotFoundError(GhApiError):
    """404: resource does not exist, or the grant cannot see it.

    GitHub returns 404 for private resources the token cannot see, so a
    404 is never proof of non-existence -- this is stated, not hidden.
    """


class GhValidationError(GhApiError):
    """422: the request body or parameters were rejected."""


class GhRateLimitedError(GhApiError):
    """Primary rate limit exhausted (403 with X-RateLimit-Remaining: 0),
    secondary rate limit (403 with retry-after), or 429.

    Retrying before the reset is not attempted here; the caller gets the
    reset epoch and decides.
    """


def _rate_limited(status, headers, body_text):
    if status == 429:
        return True
    if status != 403:
        return False
    if headers.get("x-ratelimit-remaining") == "0":
        return True
    lowered = (body_text or "").lower()
    return "secondary rate limit" in lowered or "rate limit exceeded" in lowered


def _error_for(status, headers, body_text):
    msg = body_text[:300] if body_text else f"HTTP {status}"
    rate_reset = None
    reset = headers.get("x-ratelimit-reset")
    if reset and reset.isdigit():
        rate_reset = int(reset)
    retry_after = None
    ra = headers.get("retry-after")
    if ra and ra.isdigit():
        retry_after = int(ra)
    if status == 401:
        return GhAuthError(msg, http_status=401)
    if _rate_limited(status, headers, body_text):
        return GhRateLimitedError(msg, http_status=status,
                                  retry_after=retry_after, rate_reset=rate_reset)
    if status == 403:
        return GhForbiddenError(msg, http_status=403)
    if status == 404:
        return GhNotFoundError(
            msg + " (GitHub also returns 404 for resources this grant cannot see)",
            http_status=404)
    if status == 422:
        return GhValidationError(msg, http_status=422)
    return GhApiError(msg, http_status=status)


class GitHubClient:
    """Thin authenticated client. Host is pinned; no other host is reachable."""

    def __init__(self, timeout=30):
        self.timeout = timeout

    def _raw(self, method, path, *, params=None, data=None):
        url = BASE + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        ensure_allowed_url(url, [HOST])
        body = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=body, method=method)
        for name, value in HEADERS.items():
            req.add_header(name, value)
        if body:
            req.add_header("Content-Type", "application/json")
        add_surrogate_to_request(req, CRED, allowed_hosts=[HOST])
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                headers = {k.lower(): v for k, v in resp.headers.items()}
                return resp.status, headers, read_json_response(resp)
        except urllib.error.HTTPError as e:
            headers = {k.lower(): v for k, v in e.headers.items()} \
                if e.headers else {}
            text = read_response_body(e).decode("utf-8", errors="replace")
            raise _error_for(e.code, headers, text) from e

    def request(self, method, path, *, params=None, data=None):
        """One call. Returns (status, headers, parsed body)."""
        return self._raw(method, path, params=params, data=data)

    def get(self, path, *, params=None):
        return self._raw("GET", path, params=params)[2]

    def post(self, path, data=None):
        return self._raw("POST", path, data=data)[2]

    def patch(self, path, data=None):
        return self._raw("PATCH", path, data=data)[2]

    def put(self, path, data=None):
        return self._raw("PUT", path, data=data)[2]

    def delete(self, path):
        return self._raw("DELETE", path)[2]

    def paginate(self, path, *, params=None, per_page=100, max_pages=50):
        """Yield items across Link-header pages. max_pages is a hard cap so a
        runaway pool can never turn into an unbounded API walk."""
        params = dict(params or {})
        params["per_page"] = per_page
        next_url = None
        pages = 0
        while pages < max_pages:
            if next_url is None:
                status, headers, body = self._raw("GET", path, params=params)
            else:
                # Follow the provider's own next link (host already validated).
                ensure_allowed_url(next_url, [HOST])
                status, headers, body = self._request_url("GET", next_url)
            if not isinstance(body, list):
                raise GhApiError(
                    f"paginate() expects a JSON list from {path}, got "
                    f"{type(body).__name__}")
            yield from body
            link = headers.get("link", "")
            next_url = self._next_link(link)
            pages += 1
            if not next_url:
                return
        # max_pages hit: honest signal, not silent truncation.
        raise GhApiError(f"paginate() stopped after {max_pages} pages for {path}")

    def _request_url(self, method, url):
        req = urllib.request.Request(url, method=method)
        for name, value in HEADERS.items():
            req.add_header(name, value)
        add_surrogate_to_request(req, CRED, allowed_hosts=[HOST])
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                headers = {k.lower(): v for k, v in resp.headers.items()}
                return resp.status, headers, read_json_response(resp)
        except urllib.error.HTTPError as e:
            headers = {k.lower(): v for k, v in e.headers.items()} \
                if e.headers else {}
            text = read_response_body(e).decode("utf-8", errors="replace")
            raise _error_for(e.code, headers, text) from e

    @staticmethod
    def _next_link(link_header):
        # Link: <https://...?page=2>; rel="next", <...>; rel="last"
        for part in link_header.split(","):
            part = part.strip()
            if 'rel="next"' in part:
                start = part.find("<") + 1
                end = part.find(">", start)
                if start > 0 and end > start:
                    return part[start:end]
        return None

    # ---- Convenience read paths that work on the current grant ----

    def me(self):
        return self.get("/user")

    def rate_limit(self):
        return self.get("/rate_limit")

    def repos(self):
        """All repos visible to the current grant (paginated)."""
        return list(self.paginate("/user/repos"))

    def repo(self, owner, repo):
        return self.get(f"/repos/{owner}/{repo}")

    def status(self):
        """Connection self-check: identity + granted scopes (when the
        provider reports them) + rate-limit headroom.

        Returns a dict with keys: login, id, scopes (may be None for
        fine-grained tokens, which GitHub does not report via header),
        rate_limit_core {limit, remaining, reset_epoch, reset_in_sec}.
        """
        status, headers, user = self._raw("GET", "/user")
        scopes = headers.get("x-oauth-scopes")
        scope_list = [s.strip() for s in scopes.split(",")] if scopes else None
        core = self.get("/rate_limit")["resources"]["core"]
        reset = int(core["reset"])
        return {
            "login": user.get("login"),
            "id": user.get("id"),
            "scopes": scope_list,
            "rate_limit_core": {
                "limit": core["limit"],
                "remaining": core["remaining"],
                "reset_epoch": reset,
                "reset_in_sec": max(0, reset - int(time.time())),
            },
        }


if __name__ == "__main__":
    print(json.dumps(GitHubClient().status(), indent=2))
