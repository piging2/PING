#!/usr/bin/env python3
"""Post the next queued image to the PING Social Facebook Page.

Reads ~/workspace/ping-content/queue.json, takes the first unposted item,
runs page-post.js on the Pig via the always-on headed Chrome, and marks the
item posted on success. Idempotent: a run with an empty queue exits 0 quietly.
Prints one summary line. Never prints credentials.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

HOME = os.path.expanduser("~")
CONTENT = os.path.join(HOME, "workspace", "ping-content")
QUEUE = os.path.join(CONTENT, "queue.json")
PIG_SSH = os.path.join(HOME, "workspace", "pig-fb", "pig-ssh.sh")
PIG_ENGAGE = "C:/Users/nolan/.local/share/pigi/fb-engage"


def sh(cmd):
    return subprocess.run(
        ["bash", "-c", cmd], capture_output=True, text=True, timeout=600
    )


def main():
    with open(QUEUE) as f:
        queue = json.load(f)
    items = queue["items"]
    nxt = next((it for it in items if not it.get("posted")), None)
    if nxt is None:
        print("QUEUE_EMPTY: all items posted")
        return 0

    job = {
        "page_url": queue["page_url"],
        "image_path": nxt["pig_image_path"],
        "caption": nxt["caption"],
    }
    job_local = "/tmp/page-post-job.json"
    job_pig = PIG_ENGAGE + "/page-post-job.json"
    with open(job_local, "w") as f:
        json.dump(job, f)

    setup = f"source {PIG_SSH}"
    r = sh(f"{setup} && pig_scp {job_local} \"$PIG:{job_pig}\"")
    if r.returncode != 0:
        print(f"POST_FAIL scp job: {r.stderr.strip()[:150]}")
        return 1
    r = sh(
        f"{setup} && pig_ssh \"powershell -NoProfile -Command "
        f"\\\"& 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' "
        f"'{PIG_ENGAGE}/page-post.js' '{job_pig}'\\\"\""
    )
    out = (r.stdout or "").strip().splitlines()
    result_line = out[-1] if out else ""
    if "RESULT ok=true" not in result_line:
        print(f"POST_FAIL worker: {result_line[:200]}")
        return 1

    nxt["posted"] = True
    nxt["posted_at"] = datetime.now(timezone.utc).isoformat()
    with open(QUEUE, "w") as f:
        json.dump(queue, f, indent=2)
    remaining = sum(1 for it in items if not it.get("posted"))
    print(f"POSTED {nxt['image']} ({remaining} remaining in queue)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
