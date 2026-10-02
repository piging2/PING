#!/usr/bin/env python3
"""
Harness self-verification (Phase 1 gate). Zero paid calls; deterministic.

Checks:
  1. Pack integrity: every problems/<p>/evidence.md matches pack-manifest.json
     sha256 (packs are pinned; candidates always get byte-identical input).
  2. Pack completeness: all six required sections present in each pack.
  3. Solution sealing: sealed solution-signature strings are ABSENT from packs
     (the fix must not leak into the evidence).
  4. Scorer calibration: reference good response scores >= 75, reference bad
     response scores <= 45, and good > bad + 30, for every problem.
  5. Dry-run: the runner can load every candidate config and pack without
     invoking any model.

Exit 0 = harness verified. Exit 1 = list of failures.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
PROBLEMS = ["p1-graph", "p2-render-sink", "p3-mobile-overflow"]
REQUIRED_SECTIONS = [
    "## Problem statement",
    "## Invariants",
    "## Relevant code excerpts",
    "## Test evidence",
    "## Candidate hypotheses",
    "## Your task",
]
# Strings that would indicate the sealed solution leaked into the pack.
SOLUTION_LEAK_PATTERNS = {
    "p1-graph": [r"options object as a context", r"accepts arrays first",
                 r"inject.*@vocab.*default|@vocab.*default.*inject"],
    "p2-render-sink": [r"resolveSafeLink", r'kind==="safe"', r"safe-link\.ts"],
    "p3-mobile-overflow": [r"min-w-0"],
}

failures = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name + (f": {detail}" if detail else ""))


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def main():
    # 1. pack integrity
    manifest_path = os.path.join(BASE, "pack-manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)["packs"]
    for p in PROBLEMS:
        pack = os.path.join(BASE, "problems", p, "evidence.md")
        actual = sha256_file(pack)
        expected = manifest.get(f"problems/{p}/evidence.md")
        check(f"manifest-pin {p}", actual == expected,
              f"sha256 mismatch for {p}")

    # 2. completeness
    for p in PROBLEMS:
        pack = os.path.join(BASE, "problems", p, "evidence.md")
        with open(pack) as f:
            text = f.read()
        missing = [s for s in REQUIRED_SECTIONS if s not in text]
        check(f"pack-complete {p}", not missing, f"missing: {missing}")

    # 3. solution sealing
    for p in PROBLEMS:
        pack = os.path.join(BASE, "problems", p, "evidence.md")
        with open(pack) as f:
            text = f.read()
        leaks = [pat for pat in SOLUTION_LEAK_PATTERNS[p]
                 if re.search(pat, text, re.IGNORECASE)]
        check(f"solution-sealed {p}", not leaks, f"leaked: {leaks}")

    # 4. scorer calibration
    score_py = os.path.join(BASE, "score.py")
    for p in PROBLEMS:
        key = os.path.join(BASE, "answer-keys", f"{p}.key.json")
        good = os.path.join(BASE, "calibration", f"{p}.good.txt")
        bad = os.path.join(BASE, "calibration", f"{p}.bad.txt")
        g = json.loads(subprocess.run(
            [sys.executable, score_py, key, good, "--json"],
            capture_output=True, text=True, check=True).stdout)["total"]
        b = json.loads(subprocess.run(
            [sys.executable, score_py, key, bad, "--json"],
            capture_output=True, text=True, check=True).stdout)["total"]
        check(f"calibration {p} (good={g} bad={b})",
              g >= 75 and b <= 45 and (g - b) >= 30,
              f"good={g} bad={b}")

    # 5. dry-run: runner loads configs + packs
    run_py = os.path.join(BASE, "run.py")
    r = subprocess.run([sys.executable, run_py, "--candidate", "hermes-baseline",
                        "--dry-run"], capture_output=True, text=True)
    check("runner dry-run", r.returncode == 0, r.stderr[-500:] if r.returncode else "")

    print()
    if failures:
        print(f"HARNESS VERIFICATION: FAIL ({len(failures)} failures)")
        for f_ in failures:
            print("  - " + f_)
        sys.exit(1)
    print("HARNESS VERIFICATION: PASS")


if __name__ == "__main__":
    main()
