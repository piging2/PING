#!/usr/bin/env python3
"""Deterministic test: a driver HALT must never be recorded ok=true.

Contract (from the 2026-09-15 21:15 MDT X pass): x-engage.sh builds one record
per action as {"account","url","action","ok","note"}. When the driver halts
(login gate, checkpoint, rate limit -> exit 3, note starting with "HALT"), the
record MUST be ok=false. A HALT recorded ok=true silently corrupts engagement
accounting: the guard/ledger believe an action succeeded that never ran.

Root cause (morning PROPOSAL, not fixed here): C:/Windows/Temp/x-like-run.ps1
invokes node via `&` and never propagates the exit code, so powershell.exe
always exits 0 and x-engage.sh's `rc -eq 3` branch never fires.

Evidence: hidden_files/engagement-passes/x-results-20260916-031418.json.tmp
records @garyvee's 21:18 login-gate HALT as ok=true. The repaired final file
x-results-20260916-031418.json corrects it to ok=false.

Exit 0 = contract holds on the repaired file AND the known-bad .tmp still
shows the violation (historical evidence preserved); 1 = divergence.
"""
import json
import os
import re
import sys

PASSES_DIR = os.path.expanduser(
    "~/workspace/goals/ping-social-brand-launch/hidden_files/engagement-passes")
HALT_RE = re.compile(r"(^|\])\s*HALT\b", re.IGNORECASE)

FINAL = os.path.join(PASSES_DIR, "x-results-20260916-031418.json")
KNOWN_BAD_TMP = os.path.join(PASSES_DIR, "x-results-20260916-031418.json.tmp")


def halt_records(path):
    """Records whose note indicates a driver HALT.

    The .tmp is truncated mid-record (runner died mid-write); only complete
    records are parsed, which is exactly the evidence the old code produced.
    """
    raw = open(path).read()
    last_complete = raw.rfind("},")
    if last_complete == -1:
        return []
    records = json.loads(raw[: last_complete + 1] + "]")
    return [r for r in records if HALT_RE.search(r.get("note", ""))]


def violations(path):
    return [r for r in halt_records(path) if r.get("ok") is True]


failures = []

# Case 1: the repaired final file must honor the contract.
if not os.path.exists(FINAL):
    failures.append(f"repaired final results file missing: {FINAL}")
else:
    bad = violations(FINAL)
    if bad:
        failures.append(f"HALT recorded ok=true in {FINAL}: "
                        + ", ".join(r["account"] for r in bad))
    else:
        print(f"PASS: {os.path.basename(FINAL)} honors HALT-never-ok "
              f"({len(halt_records(FINAL))} HALT record(s), all ok=false)")

# Case 2: the known-bad .tmp must still exhibit the violation (it is the
# historical evidence of the bug; if it ever stops violating, the bug was
# fixed at the source and this test needs re-examination).
if not os.path.exists(KNOWN_BAD_TMP):
    failures.append(f"known-bad evidence file missing: {KNOWN_BAD_TMP}")
else:
    bad = violations(KNOWN_BAD_TMP)
    if not bad:
        failures.append("known-bad .tmp no longer violates the contract; "
                        "re-examine whether the exit-code bug was fixed")
    else:
        print(f"PASS: known-bad .tmp still documents the violation "
              f"({', '.join(r['account'] for r in bad)} HALT recorded ok=true)")

if failures:
    for f in failures:
        print("FAIL:", f)
    sys.exit(1)
print("ALL GREEN")
