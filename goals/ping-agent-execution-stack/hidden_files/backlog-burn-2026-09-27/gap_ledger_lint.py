#!/usr/bin/env python3
"""gap_ledger_lint.py — schema lint for the burn's machine-readable gap ledger.

Stdlib only. Validates gap_ledger.jsonl (one JSON record per line):
  - required keys present: id, title, harvest_source, classification,
    status, smallest_delta, falsification_test, ledger_path, updated_ts
  - classification in the closed signal-pass vocabulary
  - status in the closed burn-status set
  - ledger_path exists (resolved against LEDGER_DIR, the file's own dir)
  - updated_ts matches ISO-8601-ish form

Exit 0 = all records valid. Exit 1 = failures, naming record + field.
Falsification: run against synthetic bad records to prove the lint bites.
"""

import json
import os
import re
import sys

LEDGER_DIR = os.path.dirname(os.path.abspath(__file__))

REQUIRED_KEYS = [
    "id",
    "title",
    "harvest_source",
    "classification",
    "status",
    "smallest_delta",
    "falsification_test",
    "ledger_path",
    "updated_ts",
]

# Closed vocabulary from ~/workspace/skills/competitive-signal-pass/gap_ledger.json
CLASSIFICATIONS = {
    "KEEP_REASONING",      # remaining work needs human/agent judgment; do not automate away
    "AUTOMATABLE",         # remaining work is mechanistic and dispatchable
    "ALREADY_AUTOMATED",   # nothing left to automate; the deterministic machinery holds
    "BLOCKED",             # externally blocked (transport, freeze, dependency)
    "NOT_WORTH_AUTOMATING",  # deliberately not fixed; cost exceeds value
}

# Closed burn-status set (coordinator-decided; honest granularity, no padding)
STATUSES = {
    "OPEN",                 # triaged, not started
    "IN_PROGRESS",          # actively being worked
    "PARTIAL",              # verified in part; honest red remainder
    "VERIFIED",             # falsification test passed as specified
    "VERIFIED_CORE",        # core verified; a named open remainder lives elsewhere
    "VERIFIED_LOCAL",       # verified locally; live-surface proof queued
    "COMPLETED",            # built and falsification demonstrated (self-evident artifact)
    "GATED",                # honestly gated on a named decision (not abandoned)
    "PARKED",               # parked on a named authority's word; do not touch
    "QUEUED_ON_TRANSPORT",  # actionable the moment the Pig route recovers
    "QUEUED_POST_FREEZE",   # actionable after the 19:00 verdict or Nolan's word
    "QUEUED_FOR_NOLAN",     # actionable only after Nolan's one-time decision/action
    "AWAITING_DECISION",    # actionable after a named lane/coordinator decision
    "BLOCKED",              # hard external block, no automatic requeue
    "UNKNOWN",              # status cannot be determined from evidence; fail-closed
    "MOOT",                 # no longer applicable; recorded so the harvester stops
}

TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$")


def lint_record(rec, lineno):
    errors = []
    rid = rec.get("id", "?") if isinstance(rec, dict) else "?"
    if not isinstance(rec, dict):
        return [(rid, "record", "not a JSON object")]

    for key in REQUIRED_KEYS:
        if key not in rec or rec[key] in (None, ""):
            errors.append((rid, key, "missing or empty"))
        elif not isinstance(rec[key], str):
            errors.append((rid, key, "not a string"))

    cls = rec.get("classification")
    if cls and cls not in CLASSIFICATIONS:
        errors.append((rid, "classification", "unknown classification %r" % (cls,)))

    st = rec.get("status")
    if st and st not in STATUSES:
        errors.append((rid, "status", "unknown status %r" % (st,)))

    lp = rec.get("ledger_path")
    if lp:
        # Ledger may live in this dir or be a path anchored elsewhere in workspace.
        candidates = [
            os.path.join(LEDGER_DIR, lp),
            os.path.expanduser(os.path.join("~/workspace", lp)),
            os.path.expanduser(os.path.join("~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27", lp)),
        ]
        if not any(os.path.exists(c) for c in candidates):
            errors.append((rid, "ledger_path", "no such file: %r" % (lp,)))

    ts = rec.get("updated_ts")
    if ts and not TS_RE.match(ts):
        errors.append((rid, "updated_ts", "not ISO-8601-ish: %r" % (ts,)))

    return errors


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(LEDGER_DIR, "gap_ledger.jsonl")
    if not os.path.exists(path):
        print("FAIL: no such file: %s" % path)
        return 1

    errors = []
    ids = []
    with open(path) as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                errors.append(("?", "json", "line %d: %s" % (lineno, e)))
                continue
            errors.extend(lint_record(rec, lineno))
            if isinstance(rec, dict) and "id" in rec:
                ids.append(rec["id"])

    for rid in ids:
        if ids.count(rid) > 1:
            errors.append((rid, "id", "duplicate id"))

    if errors:
        for rid, field, msg in errors:
            print("FAIL [%s] %s: %s" % (rid, field, msg))
        print("%d record(s), %d failure(s)" % (len(ids), len(errors)))
        return 1

    print("PASS: %d records, all schemas valid" % len(ids))
    return 0


if __name__ == "__main__":
    sys.exit(main())
