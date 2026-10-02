#!/usr/bin/env python3
"""Shared scratch harness for the Facebook slice tests.

Every test runs against FRESH scratch state; nothing touches production
outreach state:
  - SI_FB_STATE -> tmp/state (intents, budgets, leases, observations...)
  - ENGAGEMENT_GUARD_DIR -> tmp/guard (copies of the four single-copy
    eligibility-data files + minimal engagement logs + AUTHORITY.json).
    The copies are regenerated from the single source copies on every
    setup and are never written back: this is test isolation, not a fork.
  - HOLDS_JSON_PATH / AUTHORITY_JSON_PATH / AUTHORITY_CONFLICTS_DIR /
    OUTREACH_ROOT -> tmp/authority (minimal machine-readable hold and
    authority state so the REAL authority-check.py returns AUTHORITY-ALLOW).
  - ENGAGEMENT_INTENT_LEDGER -> tmp/ledger.jsonl (scratch production
    ledger for the ledger-integration test).

The ONLY fake in the system is si_fb_adapter (the boundary fixture).
Eligibility, authority, envelopes, budgets, leases, state machine,
watchdog, and recovery are all real code.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin")
SKILL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, BIN)

OUTREACH = os.path.expanduser("~/workspace/outreach")

IN_GROUP_ID = "1082777608577867"     # Living In GJ, corridor in
OUT_GROUP_ID = "2803047646497352"    # CO BizNet, corridor out
IN_GROUP_NAME = "Living In GJ"


def fresh_env():
    tmp = tempfile.mkdtemp(prefix="si-fb-test-")
    state = os.path.join(tmp, "state")
    guard = os.path.join(tmp, "guard")
    auth = os.path.join(tmp, "authority")
    os.makedirs(state)
    os.makedirs(os.path.join(guard, "eligibility-data"))
    os.makedirs(auth)
    # Eligibility data: copies of the single source copies, regenerated
    # every setup, never written back.
    for name in ("corridor.json", "blocked-businesses.json",
                 "precedent-registry.json", "action-capability.json"):
        shutil.copy(os.path.join(OUTREACH, "eligibility-data", name),
                    os.path.join(guard, "eligibility-data", name))
    # Minimal engagement logs (the guard requires all five to exist).
    for name in ("instagram-engagement.md", "facebook-engagement.md",
                 "threads-engagement.md", "x-engagement.md",
                 "tiktok-engagement.md"):
        with open(os.path.join(guard, name), "w") as f:
            f.write("# scratch engagement log for tests\n")
    # Guard-dir AUTHORITY.json for the __auto__ surface-status path.
    with open(os.path.join(guard, "AUTHORITY.json"), "w") as f:
        json.dump({"surfaces": {"facebook": {"status": "ACTIVE"}}}, f)
    # Authority state for the real authority-check.py.
    with open(os.path.join(auth, "holds.json"), "w") as f:
        json.dump({"holds": {"facebook": {"held": False}}}, f)
    with open(os.path.join(auth, "AUTHORITY.json"), "w") as f:
        json.dump({"surfaces": {"facebook": {
            "status": "ACTIVE",
            "capability": {"authorized": True}}}}, f)
    with open(os.path.join(auth, "facebook-engagement.md"), "w") as f:
        f.write("# scratch pass log for authority tail scan\n")
    env = dict(os.environ)
    env["SI_FB_STATE"] = state
    env["ENGAGEMENT_GUARD_DIR"] = guard
    env["HOLDS_JSON_PATH"] = os.path.join(auth, "holds.json")
    env["AUTHORITY_JSON_PATH"] = os.path.join(auth, "AUTHORITY.json")
    env["AUTHORITY_CONFLICTS_DIR"] = os.path.join(auth, "conflicts")
    env["OUTREACH_ROOT"] = auth
    env["ENGAGEMENT_INTENT_LEDGER"] = os.path.join(tmp, "ledger.jsonl")
    env.pop("SI_FB_CRASH_AT", None)
    env.pop("SI_FB_ADAPTER_FAULT", None)
    return tmp, env


def envelope_path(tmp):
    p = os.path.join(tmp, "envelope.json")
    env_doc = {
        "tenant": "ping-social",
        "actor": "pigi-operator",
        "authorized_accounts": ["ping.social.page"],
        "acting_account": "ping.social.page",
        "allowed_platforms": ["facebook"],
        "allowed_capabilities": ["like", "comment"],
        "allowed_action_types": ["like", "comment"],
        "prohibited_targets": [],
        "namespace_scope": "facebook:ping-social",
        "execution_budget": {"window_sec": 7200, "base": {"like": 75,
                                                          "comment": 20},
                             "ramp_per_week": {"like": 5, "comment": 3},
                             "ramp_anchor": "2026-09-08"},
        "concurrency_budget": {"max_concurrent_dispatches": 1},
        "relationship_budget": {"max_touches_per_relationship_per_30d": 2,
                                "window_days": 30},
        "platform_budget": {"max_passes_per_day": 6},
        "temporal_constraints": {"min_seconds_between_passes": 7200,
                                 "pass_window": "2h"},
        "confidence_requirements": {"min_identity_confidence": 0.5},
        "verification_requirements": {"read_after_write": True,
                                      "observer": "orchestrator"},
        "retry_policy": {"max_attempts_per_target": 2,
                         "retry_only_after_proven_no_effect": True,
                         "cooldown_sec": 3600},
        "maximum_failure_rate": 0.2,
        "maximum_unknown_rate": 0.1,
        "circuit_breaker_policy": {
            "scopes": ["action", "account", "adapter", "platform", "tenant"],
            "observation_window_sec": 86400,
            "verification_failure_threshold": 3,
            "negative_feedback_threshold": 5,
            "cooldown_sec": 3600},
        "learner": {"stage": "SHADOW",
                    "bounds": {"batch_size": [1, 20],
                               "candidate_rank_weight_recency": [0.0, 1.0]}},
    }
    with open(p, "w") as f:
        json.dump(env_doc, f, indent=1)
    return p


def candidate(cid, post_id, page="Test Bakery",
              text="Fresh sourdough today! Call (970) 555-0100 for pickup.",
              action="like", group_id=IN_GROUP_ID, group_name=IN_GROUP_NAME):
    url = ("https://www.facebook.com/groups/%s/permalink/%s/"
           % (group_id, post_id))
    return {"candidate_id": cid, "platform": "facebook", "type": action,
            "url": url, "page": page, "text": text,
            "group_id": group_id, "group_name": group_name}


def candidates_path(tmp, cands):
    p = os.path.join(tmp, "candidates.json")
    with open(p, "w") as f:
        json.dump({"candidates": cands}, f)
    return p


def run_cli(script, argv, env, expect=0):
    p = subprocess.run([sys.executable, os.path.join(BIN, script)] + argv,
                       capture_output=True, text=True, env=env, timeout=120)
    if expect is not None and p.returncode != expect:
        raise AssertionError(
            "%s %s exited %d, expected %d\nstdout: %s\nstderr: %s"
            % (script, argv, p.returncode, expect, p.stdout, p.stderr))
    return p


def seed_adapter_post(env, post_id, **kw):
    """Seed a fake post via the adapter CLI (subprocess, real env)."""
    argv = ["seed", post_id]
    if kw.get("liked"):
        argv.append("--liked")
    if kw.get("like_count"):
        argv += ["--like-count", str(kw["like_count"])]
    if kw.get("negative_feedback"):
        argv.append("--negative-feedback")
    run_cli("si_fb_adapter.py", argv, env)


def cleanup(tmp):
    shutil.rmtree(tmp, ignore_errors=True)
