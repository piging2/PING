#!/usr/bin/env python3
"""LinkedIn weekly connection-invite cap counter.

Nolan's binding param (2026-10-02 ~14:22 MDT): 100 connection invites per WEEK,
distributed across the 2h passes (~14/day pace). Enforce a weekly counter;
stop sending invites when the week cap is hit. Likes are uncapped by this file.

State file: ~/workspace/outreach/linkedin-weekly.json
  {"week_start": "2026-09-28", "sent": 12}
week_start is the ISO Monday of the current week (UTC). On week rollover the
counter resets to 0 automatically (fail-open on reset is correct: a new week
means a fresh budget).

Usage:
  linkedin-weekly-cap.py check        -> prints remaining invites this week
  linkedin-weekly-cap.py record --sent N -> adds N to this week's counter
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

CAP_PER_WEEK = 100
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "linkedin-weekly.json")


def _week_start_utc(now=None):
    now = now or datetime.now(timezone.utc)
    monday = now - __import__("datetime").timedelta(days=now.weekday())
    return monday.date().isoformat()


def _load():
    if not os.path.exists(STATE_FILE):
        return {"week_start": _week_start_utc(), "sent": 0}
    try:
        with open(STATE_FILE) as f:
            d = json.load(f)
        if not isinstance(d, dict) or "week_start" not in d or "sent" not in d:
            raise ValueError("bad schema")
        return d
    except Exception as e:
        # Corrupt state fails CLOSED: assume the cap is spent rather than
        # silently over-sending. Nolan can reset with --sent 0 after inspection.
        print(f"WEEKLY-CAP-CORRUPT state file unreadable ({e}); treating cap as spent. "
              f"Inspect {STATE_FILE} and rerun.", file=sys.stderr)
        return {"week_start": _week_start_utc(), "sent": CAP_PER_WEEK}


def _save(d):
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(d, f, indent=1)
    os.replace(tmp, STATE_FILE)


def check():
    d = _load()
    wk = _week_start_utc()
    if d["week_start"] != wk:
        d = {"week_start": wk, "sent": 0}
        _save(d)
    remaining = max(0, CAP_PER_WEEK - int(d["sent"]))
    print(remaining)
    return 0


def record(n):
    d = _load()
    wk = _week_start_utc()
    if d["week_start"] != wk:
        d = {"week_start": wk, "sent": 0}
    d["sent"] = int(d["sent"]) + int(n)
    _save(d)
    remaining = max(0, CAP_PER_WEEK - int(d["sent"]))
    print(f"recorded {n}; week {wk} sent={d['sent']} remaining={remaining}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    r = sub.add_parser("record")
    r.add_argument("--sent", type=int, required=True)
    a = ap.parse_args()
    if a.cmd == "check":
        return check()
    return record(a.sent)


if __name__ == "__main__":
    sys.exit(main())
