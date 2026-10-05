#!/usr/bin/env python3
"""GitHub API CLI using the connected custom.github credential.

Usage:
  gh-api.py status                  # self-check: identity, scopes, rate limit
  gh-api.py GET <path>              # e.g. GET /user
  gh-api.py POST <path> <json-body>  # e.g. POST /user/repos '{"name":"ping"}'
  gh-api.py DELETE <path>
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError
from gh_client import GitHubClient, GhApiError

API_BASE = "https://api.github.com"

def main():
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    if sys.argv[1].lower() == "status":
        try:
            print(json.dumps(GitHubClient().status(), indent=2))
        except GhApiError as e:
            print(f"{type(e).__name__} (HTTP {e.http_status}): {e}",
                  file=sys.stderr)
            sys.exit(1)
        return
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    method = sys.argv[1].upper()
    path = sys.argv[2]
    body = sys.argv[3] if len(sys.argv) > 3 else None

    url = API_BASE + path
    data = body.encode("utf-8") if body else None
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if data:
        headers["Content-Type"] = "application/json"

    try:
        status, result = api_call(
            method, url,
            credential="custom.github",
            allowed_hosts=["api.github.com"],
            extra_headers=headers,
            data=data,
            timeout=30,
        )
        print(json.dumps(result, indent=2))
    except ApiRequestError as e:
        print(f"HTTP {e.status}: {e.detail}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
