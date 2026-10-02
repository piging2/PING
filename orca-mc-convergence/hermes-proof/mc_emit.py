#!/usr/bin/env python3
"""mc_emit.py — emit one MC_* event for the hermes-proof lane.

Wraps ~/workspace/mission-control/emit.py. Appends to the real MC journal
(default fyd-journal-gateway/events.jsonl) AND mirrors the event into this
lane's local events.jsonl for a durable self-contained record.

Usage:
  mc_emit.py <EVENT_TYPE> <summary> [--status STATUS] [--artifact PATH]
             [--confidence HIGH|MEDIUM|LOW] [--source-ts ISO] [--dry-run]

Lane is fixed: hermes-proof. backfill=false (live observation, not backfill).
Idempotent: emit.py refuses duplicate event_ids.
"""
import datetime
import json
import os
import sys

sys.path.insert(0, os.path.expanduser("~/workspace/mission-control"))
import emit as emitlib

LANE = "hermes-proof"
HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL_JOURNAL = os.path.join(HERE, "events.jsonl")


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("event_type")
    ap.add_argument("summary")
    ap.add_argument("--status", default=None)
    ap.add_argument("--artifact", default=None)
    ap.add_argument("--confidence", default="HIGH")
    ap.add_argument("--source-ts", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    now = utcnow()
    source_ts = args.source_ts or now
    event, how = emitlib.emit_event(
        args.event_type, LANE, args.summary, source_ts, now, now,
        source_artifact="orca-mc-convergence/hermes-proof/",
        confidence=args.confidence, status=args.status, backfill=False,
        evidence_link=args.artifact, dry_run=args.dry_run,
    )
    if not args.dry_run:
        with open(LOCAL_JOURNAL, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, sort_keys=True) + "\n")
    print(json.dumps({"event_id": event["event_id"], "event_type": event["event_type"],
                      "how": how, "status": args.status}, indent=2))


if __name__ == "__main__":
    main()
