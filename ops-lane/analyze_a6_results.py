#!/usr/bin/env python3
"""Read-only analysis of the sibling lane's A6 proof-run results (v2, schema-agnostic)."""
import json
from collections import Counter

BASE = "/home/nolan/workspace/orca/unknown-outcome-experiments/"

def load(name):
    rows = []
    with open(BASE + name, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

km = load("kill-matrix-results.jsonl")
print("KILL MATRIX rows:", len(km))
print("row keys:", sorted(km[0].keys()))
print("final_result values:", dict(Counter(str(r.get("final_result")) for r in km)))
print("state values:", dict(Counter(str(r.get("state", r.get("status", "?"))) for r in km)))
print("retry_eligible values:", dict(Counter(str(r.get("retry_eligible", r.get("retry_eligibility", "?"))) for r in km)))

# integrity: any row claiming success with effect_count != 1?
odd = [(r.get("kill_point"), r.get("effect_count"), r.get("final_result")) for r in km
       if "SUCCEEDED" in str(r.get("final_result")).upper() and r.get("effect_count") not in (1, "1")]
print("success rows with effect_count != 1:", odd if odd else "none")

# integrity: UNKNOWN terminals must not be retry-eligible
def is_unknown(fr):
    s = str(fr).upper()
    return "UNKNOWN" in s and "NEVER" not in s and "RECOVERED" not in s and "SUCCEEDED" not in s
bad = [(r.get("kill_point"), r.get("final_result"), r.get("retry_eligible")) for r in km
       if is_unknown(r.get("final_result")) and str(r.get("retry_eligible")).lower() == "true"]
print("UNKNOWN terminals still retry-eligible:", bad if bad else "none")

ch = load("chaos-results.jsonl")
print("CHAOS rows:", len(ch))
print("chaos row keys:", sorted(ch[0].keys()) if ch else "empty")
print("chaos outcomes:", dict(Counter(str(r.get("outcome", r.get("result", "?"))) for r in ch)))
print("chaos scenarios:", sorted(set(str(r.get("scenario", r.get("name", "?"))) for r in ch)))
