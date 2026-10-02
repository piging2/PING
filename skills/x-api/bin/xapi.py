#!/usr/bin/env python3
"""X API v2 CLI for the x-api skill. Auth via authd surrogate exchange.

Usage:
  xapi.py me                       # verify auth, print authed user id/handle
  xapi.py follow <target_user_id>   # follow one account (idempotent)

Never prints or logs the credential. The surrogate is exchanged by authd on
egress; a request that skips it goes out unauthenticated.
"""
import json
import subprocess
import sys

sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError

API = "https://api.x.com"
ALLOWED = ["api.x.com"]

def surrogate():
    out = subprocess.run(
        ["/opt/hatch/bin/authdc", "cred", "surrogate", "custom.x"],
        capture_output=True, text=True, check=True, timeout=30,
    )
    data = json.loads(out.stdout)
    for c in data.get("credentials", []):
        if c.get("name") == "access_token":
            return c["surrogate"], c.get("placement", "bearer_header")
    raise RuntimeError("no access_token credential in custom.x surrogate map")

def call(method, path, body=None):
    # Per-CLI auth flow (authdc surrogate exchange) is intentionally kept
    # here and untouched by the consolidation; only the request envelope
    # (host allowlist, request execution, typed errors) is shared.
    tok, placement = surrogate()
    headers = {"User-Agent": "PING-social/1.0"}
    if placement == "bearer_header":
        headers["Authorization"] = "Bearer " + tok
    else:
        raise RuntimeError("unsupported placement: " + placement)
    data = json.dumps(body).encode() if body is not None else None
    if data:
        headers["Content-Type"] = "application/json"
    try:
        return api_call(
            method, API + path,
            credential=None,  # caller attached its own Authorization header
            allowed_hosts=ALLOWED,
            extra_headers=headers,
            data=data,
            timeout=60,
            response_format="raw",
        )
    except ApiRequestError as e:
        return e.status, e.body.decode()[:500]

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    cmd = sys.argv[1]
    if cmd == "me":
        status, body = call("GET", "/2/users/me")
        print(json.dumps({"http": status, "body": json.loads(body) if body else None}))
    elif cmd == "lookup":
        # Costs ~$0.01 per the 2026 rate card. Prefer free browser resolution;
        # use only after genuine browser attempts fail.
        if len(sys.argv) < 3:
            print("usage: xapi.py lookup <username>"); sys.exit(2)
        status, body = call("GET", f"/2/users/by/username/{sys.argv[2]}?user.fields=public_metrics,created_at,verified")
        try:
            parsed = json.loads(body) if body else None
        except Exception:
            parsed = {"raw": body}
        print(json.dumps({"ok": status == 200, "http": status, "response": parsed}))
        sys.exit(0 if status == 200 else 1)
    elif cmd == "followers":
        # Read-only sample of a user's followers (app-only auth OK).
        # Usage: xapi.py followers <user_id> [max_results=100] [pagination_token]
        if len(sys.argv) < 3:
            print("usage: xapi.py followers <user_id> [max_results] [pagination_token]"); sys.exit(2)
        uid = sys.argv[2]
        maxr = sys.argv[3] if len(sys.argv) > 3 else "100"
        path = (f"/2/users/{uid}/followers?max_results={maxr}"
                f"&user.fields=public_metrics,verified,description")
        if len(sys.argv) > 4:
            path += f"&pagination_token={sys.argv[4]}"
        status, body = call("GET", path)
        try:
            parsed = json.loads(body) if body else None
        except Exception:
            parsed = {"raw": body}
        print(json.dumps({"ok": status == 200, "http": status, "response": parsed}))
        sys.exit(0 if status == 200 else 1)
    elif cmd == "tweets":
        # Read-only: recent posts from a user id (excludes replies and
        # retweets). Usage: xapi.py tweets <user_id> [max_results=5]
        if len(sys.argv) < 3:
            print("usage: xapi.py tweets <user_id>"); sys.exit(2)
        uid = sys.argv[2]
        maxr = sys.argv[3] if len(sys.argv) > 3 else "5"
        path = (f"/2/users/{uid}/tweets?max_results={maxr}"
                f"&exclude=replies,retweets"
                f"&tweet.fields=created_at,public_metrics")
        status, body = call("GET", path)
        try:
            parsed = json.loads(body) if body else None
        except Exception:
            parsed = {"raw": body}
        print(json.dumps({"ok": status == 200, "http": status, "response": parsed}))
        sys.exit(0 if status == 200 else 1)
    elif cmd == "follow":
        if len(sys.argv) < 3:
            print("usage: xapi.py follow <target_user_id>"); sys.exit(2)
        target = sys.argv[2]
        me_status, me_body = call("GET", "/2/users/me")
        if me_status != 200:
            print(json.dumps({"ok": False, "error": "me lookup failed", "http": me_status}))
            sys.exit(1)
        me_id = json.loads(me_body)["data"]["id"]
        status, body = call("POST", f"/2/users/{me_id}/following",
                            {"target_user_id": target})
        try:
            parsed = json.loads(body) if body else None
        except Exception:
            parsed = {"raw": body}
        print(json.dumps({"ok": status == 200, "http": status, "response": parsed}))
        sys.exit(0 if status == 200 else 1)
    else:
        print("unknown command: " + cmd); sys.exit(2)

if __name__ == "__main__":
    main()
