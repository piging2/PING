#!/usr/bin/env python3
"""siig_guard.py: interop with the ONE deterministic eligibility function.

The skill never re-implements eligibility. It imports the real
engagement-guard.py (via importlib, since the filename contains a hyphen)
and calls eligibility_check(), stamp_evidence(), verify_evidence(), and
load_index() directly.

ENGAGEMENT_GUARD_DIR selects the outreach tree:
  - production: the real ~/workspace/outreach (single data copies, never forked)
  - tests: a scratch tree with fixture logs and fixture data files.

Plan-time = guard curate semantics: eligibility_check over candidates,
stamp_evidence on ELIGIBLE actions (sha256 envelope, 6h TTL, data-file digests).
Dispatch-time = re-run eligibility_check live on every action (never trust the
envelope) plus verify_evidence (refuse missing/tampered/stale envelopes).
"""
import importlib.util
import json
import os
import subprocess
import sys

from siig_common import OUTREACH_DIR, GUARD_PY, AUTHORITY_PY, PLATFORM

_guard_module = None


def guard():
    global _guard_module
    if _guard_module is None:
        spec = importlib.util.spec_from_file_location(
            "engagement_guard_live", GUARD_PY)
        if spec is None or spec.loader is None:
            raise RuntimeError("cannot load engagement-guard.py at %s"
                               % GUARD_PY)
        mod = importlib.util.module_from_spec(spec)
        # engagement-guard.py reads these env vars at import time.
        spec.loader.exec_module(mod)
        _guard_module = mod
    return _guard_module


def load_data_and_index():
    g = guard()
    data = g.load_eligibility_data()
    index = g.load_index()
    return g, data, index


def plan_candidates(candidates, batch_seen=None):
    """Run the real eligibility_check over normalized candidate dicts.
    Returns (eligible, dropped) where eligible items carry the guard's
    stamped evidence envelope under the 'eligibility' key."""
    g, data, index = load_data_and_index()
    batch_seen = batch_seen if batch_seen is not None else set()
    eligible, dropped = [], []
    for cand in candidates:
        verdict = g.eligibility_check(index, cand, data=data,
                                     batch_seen=batch_seen,
                                     surface_status="__auto__")
        item = dict(cand.get("action") or {})
        if verdict["decision"] == "ELIGIBLE":
            eligible.append(g.stamp_evidence(item, verdict, data))
        else:
            dropped.append({
                "candidate_id": cand.get("candidate_id"),
                "decision": verdict["decision"],
                "primary_reason": verdict["primary_reason"],
                "reasons": verdict["reasons"],
            })
    return eligible, dropped


def dispatch_refilter(actions):
    """Dispatch-time gate: re-evaluate eligibility LIVE for every action and
    verify each action's evidence envelope. Returns (passing, refused).
    Refused actions never reach the adapter."""
    g, data, index = load_data_and_index()
    batch_seen = set()
    passing, refused = [], []
    for action in actions:
        ok, why = g.verify_evidence(action, data)
        if not ok:
            refused.append({"action": action, "refusal": why})
            continue
        cand = {
            "platform": action.get("platform", PLATFORM),
            "type": action.get("type") or action.get("action"),
            "url": action.get("url"),
            "page": action.get("page"),
            "text": action.get("text"),
            "group_id": action.get("group_id"),
            "group_name": action.get("group_name"),
            "feed": action.get("feed"),
        }
        verdict = g.eligibility_check(index, cand, data=data,
                                     batch_seen=batch_seen,
                                     surface_status="__auto__")
        if verdict["decision"] == "ELIGIBLE":
            passing.append(action)
        else:
            refused.append({"action": action,
                            "refusal": "live re-evaluation: %s (%s)"
                            % (verdict["decision"],
                               verdict["primary_reason"])})
    return passing, refused


def record_completed(handle, url, action):
    """Append a GUARD-RECORD line to the durable history via the real guard's
    record subcommand, so a restart re-consults reality. Returns (ok, note)."""
    env = dict(os.environ)
    cmd = [sys.executable, GUARD_PY, "record",
           "--platform", PLATFORM, "--account", handle, "--action", action]
    if url:
        cmd += ["--url", url]
    proc = subprocess.run(cmd, capture_output=True, text=True, env=env,
                          timeout=60)
    return proc.returncode == 0, (proc.stdout + proc.stderr).strip()


def authority_check():
    """Run the real authority-check.py for instagram. Returns
    (verdict, detail) with verdict in AUTHORIZED/DENIED/CONFLICT/FAIL_CLOSED.
    Step 0 is holds.json, fail-closed. Under any non-AUTHORIZED verdict no
    instagram-cli traffic is authorized at all (gate-check-first rule)."""
    env = dict(os.environ)
    # authority-check.py resolves its tree from OUTREACH_ROOT, not
    # ENGAGEMENT_GUARD_DIR: point both at the same (possibly scratch) tree.
    env["OUTREACH_ROOT"] = OUTREACH_DIR
    proc = subprocess.run([sys.executable, AUTHORITY_PY, PLATFORM],
                          capture_output=True, text=True, env=env,
                          timeout=60)
    line = (proc.stdout or "").strip().splitlines()
    detail = line[0] if line else (proc.stderr or "").strip()
    if proc.returncode == 0:
        return "AUTHORIZED", detail
    if proc.returncode == 1:
        return "DENIED", detail
    if proc.returncode == 2:
        return "CONFLICT", detail
    return "FAIL_CLOSED", detail


def action_allowed(action):
    """Capability matrix read (single live copy). Instagram: like, comment."""
    path = os.path.join(OUTREACH_DIR, "eligibility-data",
                        "action-capability.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            caps = json.load(f)["platforms"]
    except (OSError, ValueError, KeyError):
        return False
    return bool((caps.get(PLATFORM) or {}).get(action))


def holds_state():
    path = os.path.join(OUTREACH_DIR, "holds.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)["holds"].get(PLATFORM, {})
    except (OSError, ValueError, KeyError):
        return {"held": None, "reason": "holds.json unreadable (fail closed)"}
