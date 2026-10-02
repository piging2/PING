#!/usr/bin/env python3
"""Vercel API CLI using the connected custom.vercel credential.

Usage:
  vercel-api.py GET <path>               # e.g. GET /v9/projects?limit=20
  vercel-api.py POST <path> <json-body>
  vercel-api.py DELETE <path>

Auth goes through the authd surrogate exchange (Authorization: Bearer).
Never prints or persists the raw token.
"""
import sys
import json

sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError

API_BASE = "https://api.vercel.com"
ALLOWED = ["api.vercel.com"]

def main():
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    method = sys.argv[1].upper()
    path = sys.argv[2]
    body = sys.argv[3] if len(sys.argv) > 3 else None

    url = API_BASE + path
    data = body.encode("utf-8") if body else None
    headers = {"Accept": "application/json"}
    if data:
        headers["Content-Type"] = "application/json"

    try:
        status, result = api_call(
            method, url,
            credential="custom.vercel",
            allowed_hosts=ALLOWED,
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
