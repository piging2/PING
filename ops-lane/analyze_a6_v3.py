#!/usr/bin/env python3
"""Read-only: detail on the two failed chaos scenarios."""
import json

BASE = "/home/nolan/workspace/orca/unknown-outcome-experiments/"
ch = [json.loads(l) for l in open(BASE + "chaos-results.jsonl", encoding="utf-8") if l.strip()]
for r in ch:
    if r.get("verdict") == "FAIL":
        print("SCENARIO:", r.get("chaos"))
        print("DETAIL:", json.dumps(r.get("detail"), indent=1)[:1500])
        print("---")
