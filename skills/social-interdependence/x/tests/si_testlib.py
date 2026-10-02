#!/usr/bin/env python3
"""Shared test scaffolding for the X autonomy skill tests.

Scratch outreach root: the REAL authority-check.py is copied in and run
with env overrides (OUTREACH_ROOT, HOLDS_JSON_PATH, AUTHORITY_JSON_PATH),
so tests exercise the real gate. The REAL engagement-guard.py and REAL
eligibility data files are used read-only (default X_SI paths). Scratch
state (journal, budgets, leases, circuits) lives in a temp dir; the
production ledgers are never touched.
"""
import json
import os
import shutil
import sys
import tempfile

SKILL_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(SKILL_ROOT, "bin")
FIX = os.path.join(SKILL_ROOT, "fixtures")
for p in (BIN, FIX):
    if p not in sys.path:
        sys.path.insert(0, p)

TEST_CLOCK = "2026-10-01T18:30:00+00:00"
os.environ["X_SI_CLOCK_ISO"] = TEST_CLOCK


def make_outreach_root(held=False):
    d = tempfile.mkdtemp(prefix="si-outreach-")
    shutil.copy("/home/hatch/workspace/outreach/authority-check.py", d)
    with open(os.path.join(d, "holds.json"), "w", encoding="utf-8") as f:
        json.dump({"description": "scratch holds for tests",
                   "holds": {"x": {"held": held, "set_by": "owner",
                                   "set_at": "2026-10-01T00:00:00Z",
                                   "reason": "test", "ref": "test"}}}, f)
    with open(os.path.join(d, "AUTHORITY.json"), "w", encoding="utf-8") as f:
        json.dump({"surfaces": {"x": {
            "status": "ACTIVE",
            "capability": {"authorized": True, "window": None,
                           "notes": None},
            "reason": "scratch test surface",
            "set_at": "2026-10-01T00:00:00Z",
            "set_by": "test",
            "tail_scan_from_line": 0}}}, f)
    with open(os.path.join(d, "x-engagement.md"), "w",
              encoding="utf-8") as f:
        f.write("# scratch x engagement log for tests\n")
    # The dispatch-time capability recheck reads the REAL data-file shape.
    os.makedirs(os.path.join(d, "eligibility-data"), exist_ok=True)
    shutil.copy(
        "/home/hatch/workspace/outreach/eligibility-data/action-capability.json",
        os.path.join(d, "eligibility-data", "action-capability.json"))
    os.environ["X_SI_OUTREACH_ROOT"] = d
    os.environ["X_SI_HOLDS_PATH"] = os.path.join(d, "holds.json")
    os.environ["X_SI_AUTHORITY_PATH"] = os.path.join(d, "AUTHORITY.json")
    return d


def make_envelope(**over):
    env = json.load(open(os.path.join(SKILL_ROOT, "var",
                                      "autonomy-envelope.sample.json")))
    env["execution_budget"] = {"x_like_pass": 2, "x_like_week": 50,
                               "x_follow_pass": 1, "x_follow_week": 50,
                               "x_comment_pass": 1, "x_comment_week": 50}
    for k, v in over.items():
        env[k] = v
    return env


def write_envelope(scratch, **over):
    env = make_envelope(**over)
    path = os.path.join(scratch, "envelope.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(env, f, indent=1, sort_keys=True)
    return path


def make_scratch():
    return tempfile.mkdtemp(prefix="si-x-")


def read_jsonl(path):
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("PASS " if cond else "FAIL ") + name +
          (" | " + str(detail) if detail and not cond else ""))


def summary():
    print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
    if FAIL:
        print("FAILED: " + ", ".join(FAIL))
    return 1 if FAIL else 0
