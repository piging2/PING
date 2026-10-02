#!/usr/bin/env python3
"""orphan-pass-watch.py -- read-only detector for engagement passes that died mid-run.

Rule (from the night of 2026-09-15/16, when FB Pass 48, two X passes, and
TikTok Pass 3 all left result files unfinalized because the cron worker's
resolution fired before the Pig runner finished):

    Open (unclosed) intents whose age exceeds --grace-minutes = STALE,
    i.e. a pass almost certainly died between write-intents and
    record-outcomes and needs a human/watch-agent to finalize it.
    Open intents younger than grace = RUNNING (a pass may legitimately
    be in flight); that is not an alert.

Typed states per (platform, pass_id): NO_ORPHANS / ORPHAN_RUNNING /
ORPHAN_STALE. Exit 0 = nothing stale (or only young runs), 1 = at least
one STALE orphan, 2 = usage or ledger-unreadable (fail closed).

Read-only: never writes, never mutates the ledger, never touches the Pig.
Semantics mirror action-intent-ledger.py: an intent is closed when a
record with a terminal outcome (EXECUTED, FAILED, UNKNOWN_EXECUTION,
NOT_ATTEMPTED) references its intent_id; the latest such record wins.

Usage:
    orphan-pass-watch.py [--ledger PATH] [--grace-minutes N]
                         [--platform NAME] [--now ISO8601]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_LEDGER = os.environ.get(
    "ENGAGEMENT_INTENT_LEDGER",
    os.path.join(BASE_DIR, "action-intent-ledger.jsonl"))

TERMINALS = ("EXECUTED", "FAILED", "UNKNOWN_EXECUTION", "NOT_ATTEMPTED")

# Real ledger schema (verified 2026-09-16 against action-intent-ledger.py's
# _derive/_open_intents): record_type is lowercase. Intent records carry
# record_type "intent" (+ pass_id, platform, ts). An intent is CLOSED iff it
# has a record of type "observation" (outcome in the "terminal" field),
# "finalize" (any), or "reconciliation" (outcome in the "outcome" field).
# "execution" records alone do not close an intent.
DEFAULT_GRACE_MINUTES = 90


def _fail(msg):
    print("orphan-pass-watch: %s" % msg, file=sys.stderr)


def _parse_ts(s):
    try:
        dt = datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _load_ledger(path):
    intents = {}   # intent_id -> record
    closed = set()  # intent_id with an observation/finalize/reconciliation
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except OSError as e:
        return None, "ledger-unreadable: %s" % e
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        try:
            r = json.loads(ln)
        except json.JSONDecodeError:
            continue  # ledger is append-only; skip corrupt lines, stay read-only
        rt = r.get("record_type")
        iid = r.get("intent_id")
        if not iid:
            continue
        if rt == "intent":
            intents.setdefault(iid, r)  # first intent record wins, like _derive
        elif rt == "observation" and r.get("terminal") in TERMINALS:
            closed.add(iid)
        elif rt == "finalize":
            closed.add(iid)
        elif rt == "reconciliation":
            closed.add(iid)
    return (intents, closed), None


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--ledger", default=DEFAULT_LEDGER)
    ap.add_argument("--grace-minutes", type=int, default=DEFAULT_GRACE_MINUTES)
    ap.add_argument("--platform")
    ap.add_argument("--now")
    args = ap.parse_args(argv)

    if args.grace_minutes <= 0:
        _fail("usage: --grace-minutes must be positive")
        return 2

    now = _parse_ts(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        _fail("usage: --now must be ISO8601")
        return 2

    data, err = _load_ledger(args.ledger)
    if err:
        _fail(err)
        return 2
    intents, closed = data

    groups = {}
    for iid, rec in intents.items():
        if iid in closed:
            continue
        platform = rec.get("platform")
        pass_id = rec.get("pass_id")
        if args.platform and platform != args.platform:
            continue
        key = (platform or "?", pass_id or "?")
        rec_ts = _parse_ts(rec.get("ts"))
        age_min = (now - rec_ts).total_seconds() / 60.0 if rec_ts else None
        groups.setdefault(key, []).append(
            {"intent_id": iid, "age_min": age_min})

    report = {"now": now.isoformat(), "grace_minutes": args.grace_minutes,
              "passes": [], "open_intents": 0}
    stale_any = False
    for (platform, pass_id), items in sorted(groups.items()):
        ages = [i["age_min"] for i in items if i["age_min"] is not None]
        max_age = max(ages) if ages else None
        if max_age is None:
            state = "ORPHAN_RUNNING"  # no usable ts; cannot call it stale
        elif max_age >= args.grace_minutes:
            state = "ORPHAN_STALE"
            stale_any = True
        else:
            state = "ORPHAN_RUNNING"
        report["passes"].append({
            "platform": platform, "pass_id": pass_id, "state": state,
            "open": len(items),
            "oldest_age_min": round(max_age, 1) if max_age is not None else None,
        })
        report["open_intents"] += len(items)

    print(json.dumps(report, indent=2, sort_keys=True))
    return 1 if stale_any else 0


if __name__ == "__main__":
    sys.exit(main())
