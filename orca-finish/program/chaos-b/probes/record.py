"""Shared CHAOS-B probe record format.

DOMAIN / COMPONENT / CLAIM / EVIDENCE (STATIC|TEST|LIVE) / CALLER / CALLEE /
WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY /
DEPENDENCIES / AFFECTS AGENTS

Appends JSONL to evidence/probe-records.jsonl. One record per probe.
"""
import json
import os
import time
import uuid

CHAOS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDS_PATH = os.path.join(CHAOS_DIR, "evidence", "probe-records.jsonl")

AUTHORITY = ("CHAOS-B harness: Q2 pool-exhaustion + Q1 clock-skew behavioral "
             "probes on the CHAOS-A file-backed harness lineage (scratch "
             "SQLite only, chaos-b lane dir); A5 worktree sources absent on "
             "this host, see CHECKPOINT.md")


def record(domain, component, claim, evidence, caller, callee, writer, reader,
           classification, confidence, broken_boundary, dependencies,
           affects_agents, probe_id=None, detail=None, missions=1,
           verdict_notes=""):
    rec = {
        "probe_id": probe_id or f"probe-{uuid.uuid4().hex[:8]}",
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "DOMAIN": domain,
        "COMPONENT": component,
        "CLAIM": claim,
        "EVIDENCE": evidence,
        "CALLER": caller,
        "CALLEE": callee,
        "WRITER": writer,
        "READER": reader,
        "AUTHORITY": AUTHORITY,
        "CLASSIFICATION": classification,
        "CONFIDENCE": confidence,
        "BROKEN BOUNDARY": broken_boundary,
        "DEPENDENCIES": dependencies,
        "AFFECTS AGENTS": affects_agents,
        "detail": detail or {},
        "missions": missions,
        "verdict_notes": verdict_notes,
    }
    os.makedirs(os.path.dirname(RECORDS_PATH), exist_ok=True)
    with open(RECORDS_PATH, "a") as f:
        f.write(json.dumps(rec, sort_keys=True) + "\n")
    return rec["probe_id"]
