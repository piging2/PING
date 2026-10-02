"""Live re-verification: adapter's live_* path against the public GitHub API.

Read-only, no auth. Uses 4 requests of the 60/hr unauthenticated budget:
check (1) + read_repo (1) + read_issues (1) + read_repo again (304, cheap).
Run:  PYTHONPATH=~/workspace/ping-build-program/lane-conn/github \
      python3 ~/workspace/ping-build-program/lane-conn/github/live_verify.py
"""
import json
import sys

from adapter import make_connector


def main() -> int:
    c = make_connector()
    log = []

    chk = c.live_check()
    log.append({"step": "live_check", **chk})
    print(json.dumps(log[-1], indent=2)[:800])

    r1 = c.live_read_repo("octocat", "Hello-World")
    o1 = r1.observations[0] if r1.observations else None
    log.append({"step": "live_read_repo",
                "outcome": r1.outcome.value,
                "error": r1.error_class.value if r1.error_class else None,
                "canonical_id": o1.canonical_id if o1 else None,
                "provider": o1.provenance.provider if o1 else None,
                "full_name": o1.fields.get("full_name") if o1 else None,
                "checkpoint_set": bool(r1.checkpoint)})
    print(json.dumps(log[-1], indent=2)[:800])

    i1 = c.live_read_issues("octocat", "Hello-World", per_page=5)
    log.append({"step": "live_read_issues",
                "outcome": i1.outcome.value,
                "error": i1.error_class.value if i1.error_class else None,
                "count": len(i1.observations),
                "titles": [o.fields.get("title") for o in i1.observations]})
    print(json.dumps(log[-1], indent=2)[:1200])

    # Second repo read must hit the ETag cursor: 304 -> zero observations.
    r2 = c.live_read_repo("octocat", "Hello-World")
    log.append({"step": "live_read_repo_again",
                "outcome": r2.outcome.value,
                "not_modified": len(r2.observations) == 0 and r2.outcome.value == "SUCCEEDED",
                "count": len(r2.observations),
                "detail": r2.detail})
    print(json.dumps(log[-1], indent=2))

    # Determinism on the GitHub normalize path: same raw bytes twice ->
    # identical canonical bytes (spike's proven determinism, via adapter).
    raw = {"id": 1296269, "node_id": "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
           "name": "Hello-World", "full_name": "octocat/Hello-World",
           "description": "My first repo", "private": False, "fork": False,
           "archived": False, "disabled": False,
           "html_url": "https://github.com/octocat/Hello-World",
           "default_branch": "master", "stargazers_count": 1, "forks_count": 1,
           "open_issues_count": 1, "language": None, "topics": [],
           "license": None, "pushed_at": "2026-01-01T00:00:00Z",
           "created_at": "2011-01-26T19:06:43Z"}
    b1 = c.normalize(raw, "github_repository", "attempt-a")[0].canonical_bytes()
    b2 = c.normalize(raw, "github_repository", "attempt-b")[0].canonical_bytes()
    log.append({"step": "github_normalize_determinism", "byte_identical": b1 == b2})
    print(json.dumps(log[-1], indent=2))

    log.append({"step": "live_rate", "rate": c.live_rate_limit_state()})
    print(json.dumps(log[-1], indent=2))

    ok = (chk.get("ok") is True
          and r1.outcome.value == "SUCCEEDED" and len(r1.observations) == 1
          and i1.outcome.value == "SUCCEEDED" and len(i1.observations) >= 1
          and r2.outcome.value == "SUCCEEDED" and len(r2.observations) == 0
          and b1 == b2)
    print("LIVE VERIFY:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
