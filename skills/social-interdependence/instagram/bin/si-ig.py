#!/usr/bin/env python3
"""si-ig.py: CLI for the Instagram autonomous-engagement skill.

Subcommands:
  run-pass     plan + dispatch one autonomous pass (fixture adapter)
  reconcile    recover stranded intents (never re-executes)
  verify       post-pass verify of a batch against the guard history
  status       durable state summary
  envelope     print the autonomy envelope

LIVE EXTERNAL EXECUTION: BLOCKED. No credentials exist in this environment
and the Pig CDP route (ig-discover.js) plus instagram-cli are unreachable
from here, so only the fixture adapter is available. The fixture is the
adapter-boundary fake; every other component is the real machinery.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from siig_common import STATE_ROOT, ensure_state_dirs
from siig_executor import (build_pass, execute_pass, reconcile, verify_pass,
                           load_envelope, CrashNow, AuthorityDenied,
                           InvariantViolation)


def load_fixture_adapter(script_path, discovery_path):
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "fixtures"))
    from fixture_ig_adapter import adapter_from_script_file
    with open(discovery_path, "r", encoding="utf-8") as f:
        discovery = json.load(f)
    return adapter_from_script_file(script_path, discovery)


def cmd_run_pass(args):
    ensure_state_dirs()
    envelope = load_envelope()
    adapter = load_fixture_adapter(args.script, args.discovery)
    crash_points = tuple(args.crash.split(",")) if args.crash else ()
    try:
        plan = build_pass(adapter, envelope, args.worker, crash_points)
    except (CrashNow, AuthorityDenied, InvariantViolation) as e:
        print(json.dumps({"error": type(e).__name__, "detail": str(e)}))
        return 1
    if plan.get("safe_mode"):
        print(json.dumps({"safe_mode": True,
                          "reasons": plan["reasons"]}, indent=1))
        return 0
    try:
        result = execute_pass(adapter, envelope, args.worker,
                              plan["batch_id"], crash_points)
    except (CrashNow, AuthorityDenied, InvariantViolation) as e:
        print(json.dumps({"error": type(e).__name__, "detail": str(e),
                          "batch_id": plan["batch_id"]}))
        return 1
    print(json.dumps({"batch_id": plan["batch_id"],
                      "discovered": plan["discovered"],
                      "built": len(plan["built"]),
                      "dropped": len(plan["dropped"]),
                      "watchdog": result["watchdog"],
                      "violations": result["violations"]}, indent=1))
    return 0


def cmd_reconcile(args):
    ensure_state_dirs()
    envelope = load_envelope()
    adapter = load_fixture_adapter(args.script, args.discovery)
    report = reconcile(adapter, envelope)
    print(json.dumps(report, indent=1))
    return 0


def cmd_verify(args):
    violations = verify_pass(args.batch_id)
    print(json.dumps({"batch_id": args.batch_id,
                      "violations": violations}, indent=1))
    return 1 if violations else 0


def cmd_status(_args):
    from siig_states import current_states, intents_index
    from siig_budgets import BudgetStore
    states = current_states()
    index = intents_index()
    counts = {}
    for iid, st in states.items():
        if iid.startswith("stub:"):
            continue
        counts[st] = counts.get(st, 0) + 1
    print(json.dumps({"state_root": STATE_ROOT, "intents": len(
        [i for i in index if not i.startswith("stub:")]),
        "states": counts, "budget": BudgetStore().snapshot()}, indent=1))
    return 0


def cmd_envelope(_args):
    print(json.dumps(load_envelope(), indent=1))
    return 0


def main():
    ap = argparse.ArgumentParser(prog="si-ig")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("run-pass")
    p.add_argument("--script", required=True)
    p.add_argument("--discovery", required=True)
    p.add_argument("--worker", default="worker-1")
    p.add_argument("--crash", default="")
    p.set_defaults(fn=cmd_run_pass)
    p = sub.add_parser("reconcile")
    p.add_argument("--script", required=True)
    p.add_argument("--discovery", required=True)
    p.set_defaults(fn=cmd_reconcile)
    p = sub.add_parser("verify")
    p.add_argument("--batch-id", required=True)
    p.set_defaults(fn=cmd_verify)
    p = sub.add_parser("status")
    p.set_defaults(fn=cmd_status)
    p = sub.add_parser("envelope")
    p.set_defaults(fn=cmd_envelope)
    args = ap.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
