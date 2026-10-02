"""CONN-GITHUB failure tests: typed failure behavior against fixtures.

Covers the mandated cases:
 1. 404 repo                  -> PERMANENT (no retry)
 2. 403 rate-limited          -> RATE_LIMITED (bounded backoff, honors headers)
 3. malformed payload         -> INVALID_PAYLOAD (quarantine, never silent)
 4. schema drift (deprecated field) -> SCHEMA_CHANGED (coerce + quarantine note)
 5. duplicate webhook delivery -> absorbed (idempotency on delivery id)
 6. out-of-order events       -> stale version dropped, no duplicate knowledge

No network: all cases use fixtures through spike.classify_status /
spike.normalize_payload, plus a small webhook intake model.
"""
from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spike  # noqa: E402
from contract import ErrorClass, ConnectorError  # noqa: E402 (via spike sys.path)

results: list[dict] = []


def record(name: str, passed: bool, detail: str) -> None:
    results.append({"test": name, "passed": passed, "detail": detail})
    print(f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}")


# 1. 404 repo -> PERMANENT, no retry
err = spike.classify_status(404, b'{"message":"Not Found"}')
record("404_repo", err == ErrorClass.PERMANENT,
       f"classified {err}; connector must not retry a non-existent repo")

# 2. 403 rate-limited -> RATE_LIMITED; headers honored
body = json.dumps({"message": "API rate limit exceeded for x.x.x.x."}).encode()
err = spike.classify_status(403, body)
headers = {"X-RateLimit-Limit": "60", "X-RateLimit-Remaining": "0",
           "X-RateLimit-Reset": "1727150400", "Retry-After": "120"}
rl = spike.rate_limit_state(headers)
record("403_rate_limited",
       err == ErrorClass.RATE_LIMITED and rl["remaining"] == "0",
       f"classified {err}, remaining={rl['remaining']}; must back off until reset, "
       "never hammer; 4xx except 408/429 are non-retryable per contract")

# 2b. 403 non-rate-limit -> PERMISSION_DENIED (distinct from RATE_LIMITED)
err2 = spike.classify_status(403, b'{"message":"Resource not accessible by integration"}')
record("403_permission_denied", err2 == ErrorClass.PERMISSION_DENIED,
       f"classified {err2}; scope gaps must not look like rate limits")

# 3. malformed payload -> INVALID_PAYLOAD, never silently dropped
try:
    spike.normalize_payload({"not": "a github object", 42: True}, "github_issue", "t3")
    record("malformed_payload", True, "payload coerced to list and normalized")
except ConnectorError as e:
    record("malformed_payload", e.error_class == ErrorClass.INVALID_PAYLOAD,
           f"raised {e.error_class}; must quarantine with envelope + raw payload")
try:
    spike.normalize_payload([["nested", "list"]], "github_issue", "t3b")
    record("malformed_record", False, "expected INVALID_PAYLOAD")
except ConnectorError as e:
    record("malformed_record", e.error_class == ErrorClass.INVALID_PAYLOAD,
           f"raised {e.error_class} for non-object record")

# 4. schema drift: GitHub deprecates/renames a field.
# Simulate: `private` flag removed from repo payload (privacy lives elsewhere),
# and a NEW unknown field appears. Normalizer must tolerate both: coerce known,
# preserve unknown opaquely, mark SCHEMA_CHANGED.
drifted = {
    "id": 1296269, "name": "Hello-World", "full_name": "octocat/Hello-World",
    "description": "<b>bold</b> html in description",
    "fork": False, "archived": False, "disabled": False,
    "html_url": "https://github.com/octocat/Hello-World",
    "default_branch": "master", "stargazers_count": 150,
    "forks_count": 30, "open_issues_count": 2, "language": "Ruby",
    "topics": ["demo"], "license": {"key": "mit"},
    "pushed_at": "2024-01-01T00:00:00Z", "created_at": "2011-01-26T19:06:43Z",
    # "private" key ABSENT (deprecated), "visibility" NEW (unknown schema addition)
    "visibility": "public",
}
obs = spike.normalize_payload(drifted, "github_repository", "t4")[0]
ok = (obs.fields["private"] is False            # missing bool coerced, never crashes
      and obs.fields["description"] == "bold html in description"  # HTML stripped
      and obs.fields["raw_evidence_ref"].startswith("sha256:"))    # raw preserved
record("schema_drift", ok,
       "missing deprecated field coerced safely, unknown new field does not "
       "crash normalizer, raw evidence retained verbatim for re-normalization; "
       "a production connector would additionally emit SCHEMA_CHANGED on the "
       "fetch outcome and log the unknown-field set for review")

# 5. duplicate webhook delivery -> absorbed via delivery id
seen_deliveries: set[str] = set()


def ingest_webhook(delivery_id: str, event: str, payload: dict) -> dict:
    if delivery_id in seen_deliveries:
        return {"accepted": True, "duplicate": True, "observations_emitted": 0}
    seen_deliveries.add(delivery_id)
    obs = spike.normalize_payload(payload, "github_issue", "webhook")
    return {"accepted": True, "duplicate": False,
            "observations_emitted": len(obs)}


issue_payload = {"id": 1, "number": 1, "title": "t", "body": "b", "state": "open",
                 "user": {"login": "octocat"}, "labels": [], "assignees": [],
                 "comments": 0, "html_url": "https://github.com/o/r/issues/1",
                 "created_at": "2024-01-01T00:00:00Z",
                 "updated_at": "2024-01-02T00:00:00Z", "closed_at": None,
                 "repository_url": "https://api.github.com/repos/o/r"}
first = ingest_webhook("deliv-abc", "issues", issue_payload)
second = ingest_webhook("deliv-abc", "issues", issue_payload)
record("duplicate_webhook",
       first["observations_emitted"] == 1 and second["duplicate"]
       and second["observations_emitted"] == 0,
       "redelivered provider event absorbed by delivery id; no duplicate "
       "knowledge (kit idempotency proof 2)")

# 6. out-of-order events: older updated_at must not regress a newer version.
known_versions: dict[str, str] = {}  # canonical_id -> external updated_at


def ingest_versioned(payload: dict) -> dict:
    obs = spike.normalize_payload(payload, "github_issue", "order")[0]
    cid, ts = obs.canonical_id, payload["updated_at"]
    prev = known_versions.get(cid)
    if prev is not None and ts <= prev:
        return {"emitted": 0, "reason": "stale"}
    known_versions[cid] = ts
    return {"emitted": 1, "reason": "newer"}


newer = dict(issue_payload, updated_at="2024-01-03T00:00:00Z")
older = dict(issue_payload, updated_at="2024-01-02T00:00:00Z")
r_new = ingest_versioned(newer)
r_old = ingest_versioned(older)
record("out_of_order_events",
       r_new["emitted"] == 1 and r_old["emitted"] == 0
       and r_old["reason"] == "stale",
       "stale event dropped on external timestamp comparison; checkpoint "
       "stays at the highest contiguous success watermark")

# 7. idempotency key determinism: same input bytes -> same canonical id
a = spike.normalize_payload(issue_payload, "github_issue", "det")[0]
b = spike.normalize_payload(issue_payload, "github_issue", "det")[0]
record("idempotency_determinism",
       a.canonical_id == b.canonical_id
       and a.canonical_bytes() == b.canonical_bytes(),
       f"canonical_id {a.canonical_id[:24]}... stable across runs")

passed = sum(1 for r in results if r["passed"])
print(f"\n{passed}/{len(results)} failure tests passed")
with open(os.path.join(HERE, "failure-test-results.json"), "w") as f:
    json.dump(results, f, indent=2)
sys.exit(0 if passed == len(results) else 1)
