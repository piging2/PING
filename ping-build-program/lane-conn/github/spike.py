"""CONN-GITHUB lane spike: read-only GitHub API -> PING observation format.

Zero-dependency (stdlib only). Uses the public GitHub REST API with NO auth
(60 req/hr unauthenticated; we use <= 4 requests and cache aggressively).
Demonstrates: connect/discover/read(normalize), cursor semantics
(ETag conditional requests), rate-limit state parsing, provenance envelope,
and the exact failure classifications of the BCQ contract test kit
(lane-bcq/testkit/contract.py).

Public repos only in this spike. Authenticated calls go through lane L's
secret broker in production (AuthBroker SPI); this spike never handles a
token, so it stays credential-free by construction.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
EVIDENCE_DIR = os.path.join(HERE, "evidence")
TESTKIT_DIR = os.path.join(os.path.dirname(HERE), "..", "lane-bcq", "testkit")
sys.path.insert(0, os.path.abspath(TESTKIT_DIR))
from contract import (  # noqa: E402
    Confidence,
    ConnectorError,
    ErrorClass,
    FetchOutcome,
    NormalizedObservation,
    Provenance,
    canonical_observation_id,
)

API = "https://api.github.com"
CONNECTOR_ID = "github-connector"
CONNECTOR_VERSION = "0.1.0"

USER_AGENT = "ping-connector-spike/0.1.0 (read-only research spike)"
MAX_RECORD_BYTES = 256 * 1024
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


# ------------------------------------------------------------------ HTTP layer
def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class HttpResult:
    def __init__(self, status: int, headers: dict, body: bytes):
        self.status = status
        self.headers = headers
        self.body = body


def api_get(path: str, etag: Optional[str] = None) -> HttpResult:
    """Single GET against api.github.com. No retries here; caller classifies."""
    req = urllib.request.Request(API + path, method="GET")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", USER_AGENT)
    if etag:
        req.add_header("If-None-Match", etag)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read(MAX_RESPONSE_BYTES + 1)
            if len(body) > MAX_RESPONSE_BYTES:
                raise ConnectorError(
                    ErrorClass.INVALID_PAYLOAD,
                    f"response over {MAX_RESPONSE_BYTES} bytes",
                )
            return HttpResult(resp.status, dict(resp.headers.items()), body)
    except urllib.error.HTTPError as e:
        body = e.read(MAX_RESPONSE_BYTES + 1)
        return HttpResult(e.code, dict(e.headers.items()), body)


def classify_status(status: int, body: bytes) -> ErrorClass:
    if status in (401,):
        return ErrorClass.AUTH_REQUIRED
    if status == 403:
        try:
            msg = json.loads(body).get("message", "")
        except Exception:
            msg = ""
        if "rate limit" in msg.lower() or "API rate limit exceeded" in msg:
            return ErrorClass.RATE_LIMITED
        return ErrorClass.PERMISSION_DENIED
    if status == 404:
        return ErrorClass.PERMANENT  # record does not exist; retry will not help
    if status == 429:
        return ErrorClass.RATE_LIMITED
    if status == 304:
        return None  # type: ignore[return-value]  # not-modified: no observation
    if 500 <= status < 600:
        return ErrorClass.TRANSIENT
    return ErrorClass.INVALID_PAYLOAD


def rate_limit_state(headers: dict) -> dict:
    return {
        "limit": headers.get("X-RateLimit-Limit"),
        "remaining": headers.get("X-RateLimit-Remaining"),
        "reset_at": headers.get("X-RateLimit-Reset"),
    }


# ------------------------------------------------------------- evidence store
def store_evidence(kind: str, obj: Any) -> str:
    """Write verbatim raw payload BEFORE normalization. Returns raw evidence ref."""
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    # No sort_keys: evidence is VERBATIM. A malformed payload (mixed-type keys)
    # must still be preservable; sorting would crash the evidence path itself.
    raw = json.dumps(obj, separators=(",", ":")).encode()
    digest = hashlib.sha256(raw).hexdigest()
    path = os.path.join(EVIDENCE_DIR, f"{kind}-{digest[:16]}.json")
    with open(path, "wb") as f:
        f.write(raw)
    return f"sha256:{digest}"


# ---------------------------------------------------------------- normalizers
def _sanitize_text(value: Any, cap: int = 10_000) -> tuple[str, bool]:
    """Plain-text only: strip HTML tags, cap length, mark truncation."""
    if not isinstance(value, str):
        return "", False
    import re

    text = re.sub(r"<[^>]*>", "", value)
    truncated = len(text) > cap
    return text[:cap], truncated


def normalize_repo(raw: dict, attempt_id: str) -> NormalizedObservation:
    evidence_ref = store_evidence("repo", raw)
    name, _ = _sanitize_text(raw.get("name"))
    desc, desc_truncated = _sanitize_text(raw.get("description"))
    fields = {
        "object_kind": "github_repository",
        "full_name": raw.get("full_name"),
        "name": name,
        "description": desc,
        "description_truncated": desc_truncated,
        "private": bool(raw.get("private")),
        "fork": bool(raw.get("fork")),
        "archived": bool(raw.get("archived")),
        "disabled": bool(raw.get("disabled")),
        "html_url": raw.get("html_url"),
        "default_branch": raw.get("default_branch"),
        "stars": raw.get("stargazers_count"),
        "forks": raw.get("forks_count"),
        "open_issues": raw.get("open_issues_count"),
        "language": raw.get("language"),
        "topics": (raw.get("topics") or [])[:50],
        "license_key": (raw.get("license") or {}).get("key"),
        "pushed_at": raw.get("pushed_at"),
        "created_at": raw.get("created_at"),
        "raw_evidence_ref": evidence_ref,
    }
    return NormalizedObservation(
        canonical_id=canonical_observation_id(CONNECTOR_ID, f"repo:{raw.get('id')}"),
        source_record_id=str(raw.get("id")),
        object_type="github_repository",
        fields=fields,
        provenance=Provenance(
            provider=CONNECTOR_ID,
            source_record_id=str(raw.get("id")),
            fetched_at=_utcnow(),
            fetch_attempt_id=attempt_id,
            connector_version=CONNECTOR_VERSION,
        ),
        confidence=Confidence.DIRECT,
    )


def normalize_issue(raw: dict, attempt_id: str) -> NormalizedObservation:
    evidence_ref = store_evidence("issue", raw)
    title, title_tr = _sanitize_text(raw.get("title"))
    body, body_tr = _sanitize_text(raw.get("body"), cap=10_000)
    fields = {
        "object_kind": "github_issue",
        "repo_full_name": _repo_of_url(raw.get("repository_url")),
        "number": raw.get("number"),
        "title": title,
        "title_truncated": title_tr,
        "body": body,
        "body_truncated": body_tr,
        "state": raw.get("state"),
        "is_pull_request": "pull_request" in raw,
        "labels": [l.get("name") for l in (raw.get("labels") or [])][:30],
        "author": (raw.get("user") or {}).get("login"),
        "assignees": [(a or {}).get("login") for a in (raw.get("assignees") or [])][:10],
        "comments": raw.get("comments"),
        "html_url": raw.get("html_url"),
        "created_at": raw.get("created_at"),
        "updated_at": raw.get("updated_at"),
        "closed_at": raw.get("closed_at"),
        "raw_evidence_ref": evidence_ref,
    }
    version = 1
    return NormalizedObservation(
        canonical_id=canonical_observation_id(
            CONNECTOR_ID, f"issue:{raw.get('id')}"
        ),
        source_record_id=str(raw.get("id")),
        object_type="github_issue",
        fields=fields,
        provenance=Provenance(
            provider=CONNECTOR_ID,
            source_record_id=str(raw.get("id")),
            fetched_at=_utcnow(),
            fetch_attempt_id=attempt_id,
            connector_version=CONNECTOR_VERSION,
        ),
        confidence=Confidence.DIRECT,
        version=version,
    )


def _repo_of_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    m = urllib.parse.urlparse(url).path.split("/repos/", 1)
    return m[1] if len(m) == 2 else None


def normalize_payload(raw: Any, object_type: str, attempt_id: str) -> list:
    """Deterministic: same input bytes -> same normalized observations."""
    if isinstance(raw, dict):
        raw = [raw]
    if not isinstance(raw, list):
        raise ConnectorError(ErrorClass.INVALID_PAYLOAD, "payload is not a dict or list")
    out = []
    for item in raw:
        if not isinstance(item, dict):
            raise ConnectorError(ErrorClass.INVALID_PAYLOAD, "record is not an object")
        if object_type == "github_repository":
            out.append(normalize_repo(item, attempt_id))
        elif object_type == "github_issue":
            out.append(normalize_issue(item, attempt_id))
        else:
            raise ConnectorError(
                ErrorClass.INVALID_PAYLOAD, f"unknown object_type {object_type}"
            )
    return out


# ------------------------------------------------------------------ connector
class GitHubConnector:
    """Minimal read-only connector over the public REST API.

    Contract mapping (BCQ kit):
      check      -> GET /rate_limit (reachability without spending budget)
      discover   -> static stream list (deterministic)
      read       -> GET with If-None-Match (ETag cursor); 304 = no change
      normalize  -> normalize_payload (deterministic)
      checkpoint -> stored ETag (opaque provider watermark, never parsed)
      health     -> rate-limit state + last error class
      rate limit -> X-RateLimit-* headers parsed after every call
    """

    STREAMS = ("github_repository", "github_issue", "github_pull_request",
               "github_review", "github_workflow_run", "github_release",
               "github_branch")

    def __init__(self):
        self.attempt_seq = 0
        self.etags: dict[str, str] = {}          # cursor store (opaque watermarks)
        self.rate_state: dict = {}
        self.last_error: Optional[ErrorClass] = None

    def _attempt(self) -> str:
        self.attempt_seq += 1
        return f"gh-attempt-{self.attempt_seq}-{int(time.time())}"

    def check(self) -> dict:
        attempt = self._attempt()
        res = api_get("/rate_limit")
        self.rate_state = rate_limit_state(res.headers)
        if res.status != 200:
            self.last_error = classify_status(res.status, res.body)
            return {"ok": False, "error_class": self.last_error.value}
        return {"ok": True, "rate": self.rate_state}

    def discover(self) -> list:
        return list(self.STREAMS)

    def read_repo(self, owner: str, repo: str) -> dict:
        attempt = self._attempt()
        key = f"repo:{owner}/{repo}"
        res = api_get(f"/repos/{owner}/{repo}", etag=self.etags.get(key))
        self.rate_state = rate_limit_state(res.headers)
        if res.status == 304:
            return {"outcome": FetchOutcome.SUCCEEDED, "observations": (),
                    "checkpoint": self.etags.get(key), "not_modified": True,
                    "attempt_id": attempt}
        if res.status != 200:
            err = classify_status(res.status, res.body)
            self.last_error = err
            return {"outcome": FetchOutcome.FAILED, "observations": (),
                    "checkpoint": None, "error_class": err, "attempt_id": attempt}
        new_etag = res.headers.get("ETag")
        if new_etag:
            self.etags[key] = new_etag
        raw = json.loads(res.body)
        obs = normalize_payload(raw, "github_repository", attempt)
        return {"outcome": FetchOutcome.SUCCEEDED, "observations": tuple(obs),
                "checkpoint": self.etags.get(key), "attempt_id": attempt}

    def read_issues(self, owner: str, repo: str, per_page: int = 5,
                    state: str = "all") -> dict:
        attempt = self._attempt()
        key = f"issues:{owner}/{repo}"
        qs = urllib.parse.urlencode(
            {"state": state, "per_page": per_page, "sort": "updated",
             "direction": "desc"})
        res = api_get(f"/repos/{owner}/{repo}/issues?{qs}", etag=self.etags.get(key))
        self.rate_state = rate_limit_state(res.headers)
        if res.status == 304:
            return {"outcome": FetchOutcome.SUCCEEDED, "observations": (),
                    "checkpoint": self.etags.get(key), "not_modified": True,
                    "attempt_id": attempt}
        if res.status != 200:
            err = classify_status(res.status, res.body)
            self.last_error = err
            return {"outcome": FetchOutcome.FAILED, "observations": (),
                    "checkpoint": None, "error_class": err, "attempt_id": attempt}
        new_etag = res.headers.get("ETag")
        if new_etag:
            self.etags[key] = new_etag
        raw = json.loads(res.body)
        obs = normalize_payload(raw, "github_issue", attempt)
        return {"outcome": FetchOutcome.SUCCEEDED, "observations": tuple(obs),
                "checkpoint": self.etags.get(key), "attempt_id": attempt}


def main() -> None:
    owner, repo = "octocat", "Hello-World"
    c = GitHubConnector()
    log: list[dict] = []

    chk = c.check()
    log.append({"step": "check", "result": chk})
    print(json.dumps({"step": "check", **chk}, indent=2))

    r = c.read_repo(owner, repo)
    o = r["observations"][0] if r["observations"] else None
    log.append({"step": "read_repo", "outcome": str(r["outcome"]),
                "error": str(r.get("error_class")),
                "not_modified": r.get("not_modified", False),
                "fields": o.fields if o else None,
                "provenance": json.loads(json.dumps(o.provenance.__dict__)) if o else None})
    print(json.dumps(log[-1], indent=2))

    i = c.read_issues(owner, repo, per_page=5)
    log.append({"step": "read_issues", "outcome": str(i["outcome"]),
                "count": len(i["observations"]),
                "error": str(i.get("error_class")),
                "not_modified": i.get("not_modified", False),
                "titles": [ob.fields["title"] for ob in i["observations"]],
                "rate": c.rate_state})
    print(json.dumps(log[-1], indent=2))

    # Second pass proves ETag conditional refresh (304 -> no new observations).
    r2 = c.read_repo(owner, repo)
    log.append({"step": "read_repo_again", "outcome": str(r2["outcome"]),
                "not_modified": r2.get("not_modified", False),
                "count": len(r2["observations"])})
    print(json.dumps(log[-1], indent=2))

    with open(os.path.join(EVIDENCE_DIR, "spike-run-log.json"), "w") as f:
        json.dump({"at": _utcnow(), "steps": log}, f, indent=2)
    print("evidence ->", EVIDENCE_DIR)


if __name__ == "__main__":
    main()
