#!/usr/bin/env python3
"""Approval-aggregate projector (evidence artifact, not product code).

Rebuilds the authorization state for one approval id SOLELY from the
canonical journal, read through the canonical gateway's own HTTP reader
(:18199). Folds MC_APPROVAL_* events for aggregate mc:approval:<id> in
timestamp order:

  REQUESTED -> WAITING_APPROVAL (binds proposal_digest)
  REFUSED   -> no state change (tamper/deny-by-construction audit)
  APPROVED  -> APPROVED (records decided_by / decided_at)
  DENIED / EXPIRED -> terminal, recorded

Used for stage 7 (projection reflects the event) and stage 9 (clean-room
replay: journal-only state vs the ApprovalStore's server state).
"""
import argparse
import json
import urllib.request

TYPES = [
    "MC_APPROVAL_REQUESTED",
    "MC_APPROVAL_REFUSED",
    "MC_APPROVAL_APPROVED",
    "MC_APPROVAL_DENIED",
    "MC_APPROVAL_EXPIRED",
]


def get_events(base, etype, limit=500):
    url = "%s/events/%s?limit=%d" % (base.rstrip("/"), etype, limit)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)["events"]


def project(base, approval_id):
    agg = "mc:approval:" + approval_id
    mine = []
    for t in TYPES:
        for e in get_events(base, t):
            if e.get("aggregate_id") == agg:
                mine.append(e)
    mine.sort(key=lambda e: (e.get("timestamp", ""), e.get("event_id", "")))
    state = {
        "id": approval_id,
        "status": None,
        "proposal_digest": None,
        "decided_by": None,
        "decided_at": None,
        "refusals": 0,
        "events_folded": [],
    }
    for e in mine:
        d = e.get("event_data") or {}
        state["events_folded"].append(
            "%s@%s" % (e["event_type"], e.get("timestamp", "")))
        if e["event_type"] == "MC_APPROVAL_REQUESTED":
            state["status"] = "WAITING_APPROVAL"
            state["proposal_digest"] = d.get("proposal_digest")
        elif e["event_type"] == "MC_APPROVAL_REFUSED":
            state["refusals"] += 1  # no state change, by construction
        elif e["event_type"] == "MC_APPROVAL_APPROVED":
            state["status"] = "APPROVED"
            state["decided_by"] = d.get("approver_identity")
            state["decided_at"] = d.get("stamp")
        elif e["event_type"] in ("MC_APPROVAL_DENIED", "MC_APPROVAL_EXPIRED"):
            state["status"] = e["event_type"].replace("MC_APPROVAL_", "")
            state["decided_by"] = d.get("approver_identity")
            state["decided_at"] = d.get("stamp")
    return state


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gateway", default="http://127.0.0.1:18199")
    ap.add_argument("--approval-id", required=True)
    a = ap.parse_args()
    print(json.dumps(project(a.gateway, a.approval_id), sort_keys=True))


if __name__ == "__main__":
    main()
