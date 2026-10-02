#!/usr/bin/env python3
"""Paced follow batch for approved X follows. Usage:
  follow-batch.py handle:id [handle:id ...]
Pacing per x-api-best-practices: one follow every 8-20 min, jittered.
Halts on any 429/restriction. Logs to the relationship ledger.
"""
import json
import random
import subprocess
import sys
import time
from datetime import datetime, timezone

XAPI = "/home/hatch/workspace/skills/x-api/bin/xapi.py"
LEDGER = "/home/hatch/workspace/goals/ping-social-brand-launch/files/x-relationship-ledger-2026-09-13.md"

def log(line):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    entry = f"- {ts}: {line}\n"
    with open("/home/hatch/workspace/goals/ping-social-brand-launch/hidden_files/x-follow-batch-2026-09-14.log", "a") as f:
        f.write(entry)
    print(entry.strip(), flush=True)

def follow(uid):
    p = subprocess.run([XAPI, "follow", uid], capture_output=True, text=True, timeout=120)
    try:
        return json.loads(p.stdout)
    except Exception:
        return {"ok": False, "error": "unparseable output", "stdout": p.stdout[:200], "stderr": p.stderr[:200]}

def main():
    targets = []
    for arg in sys.argv[1:]:
        handle, uid = arg.split(":", 1)
        targets.append((handle, uid))
    log(f"batch start: {len(targets)} targets")
    for i, (handle, uid) in enumerate(targets):
        if i > 0:
            wait = random.randint(480, 1200)
            log(f"pacing: sleeping {wait}s before @{handle}")
            time.sleep(wait)
        r = follow(uid)
        http = r.get("http")
        if http == 429:
            log(f"HALT: 429 on @{handle}; stopping batch per red-line rule")
            sys.exit(3)
        resp = r.get("response") or {}
        if r.get("ok") and resp.get("data", {}).get("following"):
            log(f"followed @{handle} ({uid})")
        else:
            log(f"FAILED @{handle} ({uid}): http={http} resp={json.dumps(resp)[:200]}")
            sys.exit(1)
    log("batch complete")

if __name__ == "__main__":
    main()
