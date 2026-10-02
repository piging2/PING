#!/usr/bin/env python3
"""Read-only: chaos verdicts + assert evidence from the sibling A6 run."""
import json, os

BASE = "/home/nolan/workspace/orca/unknown-outcome-experiments/"

ch = [json.loads(l) for l in open(BASE + "chaos-results.jsonl", encoding="utf-8") if l.strip()]
print("CHAOS rows:", len(ch))
for r in ch:
    print("-", r.get("chaos"), "| verdict:", r.get("verdict"),
          "| op_state:", r.get("operation_state"),
          "| reconcile:", str(r.get("reconcile"))[:120])

names = sorted(os.listdir(BASE))
print("files:", [n for n in names if "assert" in n.lower() or "proof" in n.lower() or "summary" in n.lower()])

km = [json.loads(l) for l in open(BASE + "kill-matrix-results.jsonl", encoding="utf-8") if l.strip()]
print("kill-point expectations met:")
for r in sorted(km, key=lambda x: x["kill_point"]):
    print("  pt", r["kill_point"], "| expect:", str(r.get("expectation"))[:80],
          "| got:", str(r.get("final_result"))[:70])
