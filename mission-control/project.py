#!/usr/bin/env python3
"""Mission Control deterministic projector.

journal (append-only JSONL, existing event plane) -> one JSON state document.

Hard rules encoded here:
- MC_* events only. No other stream is projected.
- Deterministic: events processed in (timestamp, event_id) order; output has
  sorted keys; --as-of is REQUIRED so no wall clock leaks into the projection.
- import_timestamp is the acceptance/order key. It is never used as a causal
  sort key: within a lane, display order is source_timestamp.
- Backfilled data can NEVER render a lane GREEN. GREEN requires a live
  (backfill=false) MC_GATE_RESULT with outcome PASS signed by a gate or
  falsifier. A backfilled PASS renders as PASS-UNVERIFIED.
- Lanes without a heartbeat render STALE/UNKNOWN, never green, never failed.
  No MC_HEARTBEAT observed yet in this sample => every lane is UNKNOWN-LIVENESS.
- Every lane row carries as_of + source artifact path + digest.
- Stale/missing numbers: staleness = as_of - last observation. Never hidden.

Usage: python3 project.py --journal <path> --as-of <ISO-8601> --out <path>
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

HEARTBEAT_STALE_AFTER_SECONDS = 6 * 3600  # documented, not a wall clock


def parse_ts(s):
    if s is None:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def load_events(path):
    events = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            ev = json.loads(line)
            if str(ev.get("event_type", "")).startswith("MC_"):
                events.append(ev)
    # Deterministic processing order: acceptance time, then id.
    events.sort(key=lambda e: (e.get("timestamp", ""), e.get("event_id", "")))
    return events


def project(events, as_of):
    lanes = {}
    for ev in events:
        d = ev.get("event_data", {})
        lane = d.get("lane")
        if not lane:
            continue
        row = lanes.setdefault(lane, {
            "lane": lane,
            "events": [],
            "last_heartbeat_at": None,
            "status": "UNKNOWN",
            "status_event": None,
        })
        row["events"].append(ev)
        if ev["event_type"] == "MC_HEARTBEAT":
            row["last_heartbeat_at"] = ev["timestamp"]

        # Status derivation. HOLD is sticky until cleared.
        if ev["event_type"] == "MC_HOLD_RAISED":
            row["status"] = "HOLD"
            row["status_event"] = ev["event_id"]
        elif ev["event_type"] == "MC_HOLD_CLEARED":
            row["status"] = "UNKNOWN"  # falls back; next projection may refine
            row["status_event"] = ev["event_id"]
        elif ev["event_type"] == "MC_LANE_COMPLETED":
            row["status"] = "COMPLETED"
            row["status_event"] = ev["event_id"]
        elif ev["event_type"] == "MC_LANE_FAILED":
            row["status"] = "FAILED"
            row["status_event"] = ev["event_id"]
        elif ev["event_type"] == "MC_GATE_RESULT":
            outcome = d.get("status")
            backfilled = d.get("backfill", False)
            verifier = d.get("verifier")
            if outcome == "PASS" and not backfilled and verifier in ("gate", "falsifier"):
                row["status"] = "GREEN"
            elif outcome == "PASS":
                row["status"] = "PASS-UNVERIFIED"
            else:
                row["status"] = outcome or "UNKNOWN"
            row["status_event"] = ev["event_id"]
        elif ev["event_type"] in ("MC_LANE_STARTED", "MC_CHECKPOINT", "MC_ARTIFACT_PUBLISHED", "MC_ESCALATION"):
            if row["status"] in ("UNKNOWN",):
                row["status"] = "CHECKPOINT" if ev["event_type"] == "MC_CHECKPOINT" else "EVIDENCE"
                row["status_event"] = ev["event_id"]

    as_of_dt = parse_ts(as_of)
    out_lanes = {}
    for lane in sorted(lanes):
        row = lanes[lane]
        evs = row["events"]
        last_ev = evs[-1]
        last_d = last_ev["event_data"]
        last_seen = parse_ts(last_d.get("observation_timestamp")) or parse_ts(last_d.get("source_timestamp"))
        staleness_s = (as_of_dt - last_seen).total_seconds() if last_seen else None

        # Liveness: no heartbeat ever observed => UNKNOWN-LIVENESS.
        if row["last_heartbeat_at"] is None:
            liveness = "UNKNOWN-LIVENESS"
        elif (as_of_dt - parse_ts(row["last_heartbeat_at"])).total_seconds() > HEARTBEAT_STALE_AFTER_SECONDS:
            liveness = "STALE"
        else:
            liveness = "LIVE"

        # Fail-closed rendering: no heartbeat => never green, whatever the data says.
        display_status = row["status"]
        if liveness != "LIVE" and display_status == "GREEN":
            display_status = "GREEN-BLOCKED-NO-HEARTBEAT"

        evid_rows = []
        for e in sorted(evs, key=lambda e: (e["event_data"].get("source_timestamp", ""),
                                           e["event_id"])):
            sa = e["event_data"]["source_artifact"] or {}
            files = sa.get("files") if isinstance(sa, dict) else None
            if files:
                for f in files:
                    evid_rows.append({
                        "path": f.get("path"), "sha256": f.get("sha256"),
                        "confidence": e["event_data"].get("confidence"),
                        "event_id": e["event_id"],
                        "note": sa.get("note")})
            else:
                evid_rows.append({
                    "path": sa.get("path"), "sha256": sa.get("sha256"),
                    "confidence": e["event_data"].get("confidence"),
                    "event_id": e["event_id"],
                    "note": sa.get("note") if isinstance(sa, dict) else None})
        out_lanes[lane] = {
            "lane": lane,
            "display_status": display_status,
            "liveness": liveness,
            "last_heartbeat_at": row["last_heartbeat_at"],
            "event_count": len(evs),
            "all_backfilled": all(e["event_data"].get("backfill") for e in evs),
            "last_event": {
                "event_id": last_ev["event_id"],
                "event_type": last_ev["event_type"],
                "summary": last_d.get("summary"),
                "source_timestamp": last_d.get("source_timestamp"),
                "observation_timestamp": last_d.get("observation_timestamp"),
            },
            "staleness_seconds": staleness_s,
            "evidence": evid_rows,
            "as_of": as_of,
        }
    return {
        "projection": "mission-control",
        "as_of": as_of,
        "journal": os.path.abspath(sys.argv[sys.argv.index("--journal") + 1]) if "--journal" in sys.argv else None,
        "heartbeat_stale_after_seconds": HEARTBEAT_STALE_AFTER_SECONDS,
        "lane_count": len(out_lanes),
        "lanes": out_lanes,
        "paging_note": "Paging follows Nolan's 7 reporting categories only. "
                       "This projection raises no pages on its own.",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--journal", required=True)
    ap.add_argument("--as-of", required=True,
                    help="ISO-8601 timestamp the projection is computed at (required: no wall clock).")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    events = load_events(args.journal)
    doc = project(events, args.as_of)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2, sort_keys=True)
        f.write("\n")
    print("projected %d MC events into %d lanes -> %s" % (len(events), doc["lane_count"], args.out))


if __name__ == "__main__":
    main()
