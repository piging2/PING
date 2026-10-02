#!/usr/bin/env python3
"""FIXTURE Facebook adapter. The ONLY component in this skill that fakes the
outside world. Everything else is real machinery running against scratch
state; this module stands in for the Pig-side browser worker (engage.js via
CDP :9223) which is unreachable from this environment.

The adapter is DUMB by construction (NO_ADAPTER_DECISION_AUTHORITY):
  - it receives an authorized intent (platform, action, target_ref, content)
  - it reads external state, executes, and returns RAW execution evidence
  - it never chooses targets, never sets policy or budgets, and never
    declares canonical success. assert_adapter_evidence_shape() rejects any
    record carrying a canonical field; a violation is fed to the watchdog
    as a verification failure.

The fixture models Facebook's post surface as durable JSON state under
SI_FB_STATE/adapter_facebook.json (the fake "Facebook servers"): posts with
like state, like counts, and comment lists. It mirrors engage.js
observables: idempotent like pre-read (checks Unlike first), read-after-
write state checks, checkpoint abort detection, logged-out detection.

Fault injection (SI_FB_ADAPTER_FAULT, for failure-injection and
adversarial tests):
  timeout_before_request   raise before touching external state
  crash_during_request     mutate state, then die before returning evidence
  timeout_after_success    mutate state, return a timeout instead of evidence
  lie_about_success        return ok evidence without mutating state
  checkpoint_abort         report a platform checkpoint/abort signal
  expired_credential       report logged-out; no mutation attempted
  platform_outage          every call raises outage; no mutation attempted
  outage_after_probe       probe reads succeed; execute and real reads raise
                           (platform dies mid-pass; UNKNOWN cannot resolve)

LIVE EXTERNAL EXECUTION: BLOCKED. No credentials exist in this environment
and the Pig CDP endpoint is unreachable from here. The production adapter
contract this fixture implements is documented in CAPABILITY_MATRIX.md.
"""
import json
import os
import sys

BIN = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BIN)
import si_fb_invariants as inv  # noqa: E402
import si_fb_state as st  # noqa: E402


class AdapterFault(Exception):
    """Simulated adapter-side failure. Carries whether external state was
    mutated before the fault, so tests can assert recovery semantics."""


def fault_mode():
    return os.environ.get("SI_FB_ADAPTER_FAULT", "")


def _server():
    return st.read_json("adapter_facebook.json", {"posts": {}}) or {"posts": {}}


def _save_server(srv):
    st.write_json_atomic("adapter_facebook.json", srv)


def seed_post(post_id, liked=False, like_count=0, comments=(),
              negative_feedback=False):
    """Test setup: create a fake post on the fake Facebook."""
    srv = _server()
    srv["posts"][post_id] = {
        "liked": bool(liked),
        "like_count": int(like_count),
        "comments": list(comments),
        "negative_feedback": bool(negative_feedback),
    }
    _save_server(srv)


def read(post_id):
    """Read-only external-state read. Safe in safe mode; never mutates."""
    mode = fault_mode()
    if mode == "platform_outage":
        raise AdapterFault("platform outage: read failed")
    if mode == "outage_after_probe" and post_id != "__probe__":
        # The platform dies after the health probe answers: execute and
        # real reads fail, so an in-flight intent goes UNKNOWN and
        # read-back cannot resolve it.
        raise AdapterFault("platform outage: read failed")
    srv = _server()
    p = srv["posts"].get(post_id)
    if p is None:
        return {"post_id": post_id, "exists": False}
    return {"post_id": post_id, "exists": True, "liked": p["liked"],
            "like_count": p["like_count"],
            "comments": list(p["comments"]),
            "negative_feedback": p["negative_feedback"]}


def execute(intent):
    """Execute one authorized intent. Returns RAW evidence only:
    {attempted, external_mutation_made, observed, note}. The orchestrator,
    not this module, decides canonical outcome via read-after-write
    verification."""
    mode = fault_mode()
    action = intent["action"]
    target = intent["target_ref"]            # post:<id> form
    post_id = target.split(":", 1)[1]
    if mode == "platform_outage":
        raise AdapterFault("platform outage: request failed")
    if mode == "outage_after_probe":
        raise AdapterFault("platform outage: request failed")
    if mode == "expired_credential":
        return {"attempted": False, "external_mutation_made": False,
                "observed": None,
                "note": "logged out: Facebook session expired in the "
                        "always-on browser; no mutation attempted"}
    if mode == "timeout_before_request":
        raise AdapterFault("request timed out before reaching Facebook")
    if mode == "checkpoint_abort":
        return {"attempted": True, "external_mutation_made": False,
                "observed": None,
                "note": "checkpoint signal detected; pass aborted, "
                        "no mutation committed"}
    if mode == "lie_about_success":
        # Adapter claims a mutation it did not make. Checked BEFORE any
        # state is touched: the orchestrator's read-after-write
        # verification must catch this; the lie is counted as a
        # verification failure, never as success.
        return {"attempted": True, "external_mutation_made": False,
                "observed": {"like_button_state_changed": True},
                "note": "FAKE: adapter claims success without mutation "
                        "(adversarial fixture)"}

    srv = _server()
    p = srv["posts"].get(post_id)
    if p is None:
        return {"attempted": True, "external_mutation_made": False,
                "observed": None, "note": "post not found"}

    mutated = False
    if action == "like":
        # Idempotent pre-read, mirroring engage.js: check Unlike first.
        if p["liked"]:
            evidence = {"attempted": True, "external_mutation_made": False,
                        "observed": {"already_liked": True},
                        "note": "already liked (Unlike state visible); "
                                "no click sent"}
        else:
            p["liked"] = True
            p["like_count"] += 1
            mutated = True
            evidence = {"attempted": True, "external_mutation_made": True,
                        "observed": {"like_button_state_changed": True},
                        "note": "like registered (button state changed)"}
    elif action == "comment":
        text = intent.get("content") or ""
        if text in p["comments"]:
            evidence = {"attempted": True, "external_mutation_made": False,
                        "observed": {"already_commented": True},
                        "note": "identical comment text already present; "
                                "no submit sent"}
        else:
            p["comments"].append(text)
            mutated = True
            evidence = {"attempted": True, "external_mutation_made": True,
                        "observed": {"comment_text_visible": True},
                        "note": "comment text visible after submit"}
    else:
        return {"attempted": False, "external_mutation_made": False,
                "observed": None,
                "note": "unsupported action %r" % action}
    _save_server(srv)

    # Faults that fire around the mutation.
    if mode == "crash_during_request":
        raise AdapterFault("worker crashed during request; external state "
                           "WAS mutated" if mutated else
                           "worker crashed during request")
    if mode == "timeout_after_success":
        raise AdapterFault("request timed out after Facebook committed the "
                           "mutation" if mutated else
                           "request timed out; no mutation made")
    inv.assert_adapter_evidence_shape(evidence)
    return evidence


def cli():
    import argparse
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("read")
    r.add_argument("post_id")
    e = sub.add_parser("execute")
    e.add_argument("--action", required=True)
    e.add_argument("--target-ref", required=True)
    e.add_argument("--content", default="")
    s = sub.add_parser("seed")
    s.add_argument("post_id")
    s.add_argument("--liked", action="store_true")
    s.add_argument("--like-count", type=int, default=0)
    s.add_argument("--negative-feedback", action="store_true")
    args = p.parse_args()
    try:
        if args.cmd == "read":
            print(json.dumps(read(args.post_id), indent=1))
        elif args.cmd == "execute":
            print(json.dumps(execute({"action": args.action,
                                      "target_ref": args.target_ref,
                                      "content": args.content}), indent=1))
        elif args.cmd == "seed":
            seed_post(args.post_id, liked=args.liked,
                      like_count=args.like_count,
                      negative_feedback=args.negative_feedback)
            print(json.dumps({"seeded": args.post_id}, indent=1))
    except AdapterFault as e:
        print(json.dumps({"fault": str(e)}), file=sys.stderr)
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(cli())
