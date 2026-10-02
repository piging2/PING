#!/usr/bin/env python3
"""One-real-mission driver (evidence artifact, not product code).

Subcommands:
  record   create the synthetic probe proposal via the canonical
           request_approval primitive (the same primitive the MC
           approvals route's decide path and the P0 record path use).
  execute  perform the approved effect: emit one MC_LANE_COMPLETED probe
           event to the canonical journal. Idempotent: the event_id is
           content-derived, so a retried execution with identical
           arguments is refused as a duplicate by the journal append.

All mission data is synthetic and labeled. No secrets, no PII, no
external effects.
"""
import argparse
import hashlib
import json
import os
import sys

_MC = "/home/nolan/projects/ping/mc-approval"
if _MC not in sys.path:
    sys.path.insert(0, _MC)

from approval_request import (  # noqa: E402
    ApprovalStore,
    canonical_proposal_bytes,
    proposal_digest,
    request_approval,
)
from emit import emit_event  # noqa: E402

CONSEQUENCE = {
    "reversibility": "reversible",
    "external_effect": "none",
    "money": "0",
    "publication": "none",
    "privacy": "none",
    "credential_access": "none",
    "destructive_scope": "none",
    "commitment": "none",
}

MISSION = "mission-probe-20261001"


def cmd_record(a):
    with open(a.proposal_json, encoding="utf-8") as f:
        proposal = json.load(f)
    # Independent digest computation, shown alongside the primitive's own.
    independent_digest = proposal_digest(proposal)
    approval_id = "mprobe-" + hashlib.sha256(
        (MISSION + "|" + independent_digest).encode("utf-8")
    ).hexdigest()[:12]
    store = ApprovalStore(a.store)
    result = request_approval(
        store,
        proposal,
        capability="mc.probe.synthetic",
        actor="mission-lane:one-real-mission",
        consequence=dict(CONSEQUENCE),
        summary=(
            "SYNTHETIC PROBE %s: one harmless reversible mission proving "
            "the live proposal->approval chain" % MISSION
        ),
        why=(
            "Truth-swarm integration priority: prove proposal creation, "
            "digest binding, exact-digest approval, tamper refusal, "
            "once-only execution, canonical journal write, projection, "
            "refresh survival, and replay reconstruction. No external effect."
        ),
        journal_file=a.journal,
        approval_id=approval_id,
        tenant="ping",
    )
    out = dict(result)
    out["independent_digest"] = independent_digest
    rec = result.get("record") or {}
    out["digest_match"] = independent_digest == rec.get("proposal_digest")
    out["canonical_bytes"] = canonical_proposal_bytes(proposal).decode("utf-8")
    print(json.dumps(out, sort_keys=True, default=str))


def cmd_execute(a):
    event, how = emit_event(
        "MC_LANE_COMPLETED",
        a.lane,
        a.summary,
        source_timestamp=a.stamp,
        observation_timestamp=a.stamp,
        import_timestamp=a.stamp,
        source_artifact=MISSION,
        confidence="HIGH",
        status="probe-complete",
        backfill=False,
        journal_file=a.journal,
    )
    print(json.dumps({
        "event_id": event["event_id"],
        "how": how,
        "aggregate_id": event["aggregate_id"],
        "event_type": event["event_type"],
    }, sort_keys=True))


def main(argv):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("record")
    r.add_argument("--store", required=True)
    r.add_argument("--journal", required=True)
    r.add_argument("--proposal-json", required=True)

    e = sub.add_parser("execute")
    e.add_argument("--journal", required=True)
    e.add_argument("--lane", required=True)
    e.add_argument("--summary", required=True)
    e.add_argument("--stamp", required=True)

    args = ap.parse_args(argv)
    if args.cmd == "record":
        cmd_record(args)
    else:
        cmd_execute(args)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
