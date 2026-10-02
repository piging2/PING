#!/usr/bin/env python3
"""Fixture worker for the action-intent crash proof.

Mimics the engage.js contract: iterates the job's actions sequentially,
writing a per-action 'started' heartbeat BEFORE the per-action delay, then
appending the per-action outcome to the result file AFTER the delay. The
result file is always valid JSON, so a SIGKILL at any moment leaves a
partial result that a reconciler can inspect as deliberate recovered
evidence.

Usage: fake_worker.py --job JOB.json --heartbeat HB.jsonl --result RES.json --delay SEC
"""
import argparse
import json
import os
import time
from datetime import datetime, timezone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--job", required=True)
    ap.add_argument("--heartbeat", required=True)
    ap.add_argument("--result", required=True)
    ap.add_argument("--delay", type=float, default=5.0)
    a = ap.parse_args()

    with open(a.job, "r", encoding="utf-8") as f:
        actions = json.load(f)["actions"]

    results = []

    def write_result(complete):
        with open(a.result, "w", encoding="utf-8") as f:
            json.dump({"ok": True, "complete": complete, "results": results}, f)
            f.write("\n")

    with open(a.heartbeat, "w", encoding="utf-8") as hb:
        for act in actions:
            hb.write(json.dumps({
                "account": act["account"], "action": act["action"],
                "url": act["url"], "event": "started",
                "ts": datetime.now(timezone.utc).isoformat()}) + "\n")
            hb.flush()
            os.fsync(hb.fileno())
            time.sleep(a.delay)  # "executing" the external commitment
            results.append({"type": act["action"], "url": act["url"],
                            "ok": True,
                            "note": "fixture: simulated successful action"})
            write_result(False)
    write_result(True)


if __name__ == "__main__":
    main()
