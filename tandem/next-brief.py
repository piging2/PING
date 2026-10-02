#!/usr/bin/env python3
"""Derive the next Meta AI research brief slug.

Rotation policy (2026-09-14 fix): a failed run never advances the rotation.
- Anchor: the most recent run with outcome "ok" whose brief_id is a cycle slug.
- Owed: cycle briefs whose LATEST run is non-ok (failed and never retried to ok,
  including briefs that failed before a later brief succeeded).
- Next = first owed brief in cycle order after the anchor's brief.
- If nothing is owed, next = successor of the anchor's brief (normal advance).
- Non-cycle briefs (experiments like e-*, f-*, learn-*, test fixtures) are ignored.

Lifecycle (2026-09-17, automation-resilience program): briefs that are
QUARANTINED or at TERMINAL_FAILURE (>=3 consecutive contract rejections)
are removed from the candidate cycle BEFORE the algorithm above runs.
The key invariant: terminal failure of one brief NEVER stalls the rotation;
the scheduler advances past it. Skipped briefs are reported on stderr.
If every cycle brief is quarantined/terminal, exit 3 (rotation exhausted):
the caller must NOT run any prompt and must stop quietly.

Reads ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl
Prints the slug to stdout. Exit 2 if the ledger is missing/unreadable.
Exit 3 if the rotation is exhausted. Env overrides (tests):
META_INTEL_LEDGER, TANDEM_QUARANTINE_DIR.
"""
import importlib.util
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "brief_lifecycle", os.path.join(_HERE, "brief-lifecycle.py"))
_lifecycle = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_lifecycle)
_gspec = importlib.util.spec_from_file_location(
    "check_objective_contract",
    os.path.join(_HERE, "check-objective-contract.py"))
_gate = importlib.util.module_from_spec(_gspec)
_gspec.loader.exec_module(_gate)
_ggspec = importlib.util.spec_from_file_location(
    "check_geography_contract",
    os.path.join(_HERE, "check-geography-contract.py"))
_ggate = importlib.util.module_from_spec(_ggspec)
_ggspec.loader.exec_module(_ggate)

CYCLE = ["a-weak-website-hunt", "b-new-business-radar",
         "c-review-complaint-signals", "d-segment-deep-dive",
         "h-marketing-intelligence"]
LEDGER = os.environ.get("META_INTEL_LEDGER", os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl"))


def main():
    try:
        lines = [json.loads(l) for l in open(LEDGER) if l.strip()]
    except Exception as e:
        print(f"ledger unreadable: {e}", file=sys.stderr)
        return 2
    cycle_runs = [r for r in lines if r.get("brief_id") in CYCLE]

    # Lifecycle: drop quarantined / terminal-failure briefs from the cycle.
    quarantined = _lifecycle.quarantined_briefs()
    skipped = {}
    for b in CYCLE:
        st = _lifecycle.brief_state(b, cycle_runs, quarantined)
        if st in ("QUARANTINED", "TERMINAL_FAILURE"):
            skipped[b] = st
    effective = [b for b in CYCLE if b not in skipped]
    for b, st in skipped.items():
        print(f"lifecycle: skipping {b} ({st}); rotation advances past it",
              file=sys.stderr)
        if st == "TERMINAL_FAILURE":
            print(f"lifecycle: RECOMMENDATION: {b} reached TERMINAL_FAILURE "
                  f"({_lifecycle.consecutive_contract_failures(cycle_runs, b)} "
                  f"consecutive contract rejections, budget "
                  f"{_lifecycle.RETRY_LIMIT}); recommend human quarantine "
                  f"approval", file=sys.stderr)
    # Objective/contract compatibility (2026-09-20 self-audit): a brief whose
    # objective is not a prospect-list objective must not be dispatched with
    # the business-list OUTPUT CONTRACT. Skipped from the effective cycle
    # (like quarantined briefs) so one blocked brief never stalls rotation.
    # meta-pass.sh re-checks at dispatch as a backstop for direct invocations.
    for b in CYCLE:
        verdict, msg = _gate.check(b)
        if verdict == "incompatible" and b in effective:
            effective.remove(b)
            print(f"lifecycle: skipping {b} (objective/contract incompatible); "
                  f"rotation advances past it", file=sys.stderr)
            print(f"lifecycle: {msg}", file=sys.stderr)
    # Geography-contract gate (2026-09-21 self-audit): a brief whose
    # objective names out-of-zone towns in an inclusion context (stale
    # priority-town list) must not be dispatched until the brief is fixed.
    # Skipped from the effective cycle so one stale brief never stalls
    # rotation. meta-pass.sh re-checks at dispatch as a backstop.
    for b in CYCLE:
        verdict, msg = _ggate.check(b)
        if verdict == "incompatible" and b in effective:
            effective.remove(b)
            print(f"lifecycle: skipping {b} (geography contract "
                  f"incompatible); rotation advances past it", file=sys.stderr)
            print(f"lifecycle: {msg}", file=sys.stderr)
    if not effective:
        print("lifecycle: rotation exhausted: every cycle brief is "
              "quarantined or at terminal failure; human intervention required",
              file=sys.stderr)
        return 3
    NEXT = {effective[i]: effective[(i + 1) % len(effective)]
            for i in range(len(effective))}
    eff_runs = [r for r in cycle_runs if r.get("brief_id") in effective]

    # Anchor: last ok run among effective cycle briefs (ledger order = chronological)
    anchor = None
    for r in reversed(eff_runs):
        if r.get("outcome") == "ok":
            anchor = r.get("brief_id")
            break
    if anchor is None:
        # No ok run yet: start at the top of the effective cycle
        print(effective[0])
        return 0

    # Latest outcome per brief
    latest = {}
    for r in eff_runs:
        latest[r.get("brief_id")] = r.get("outcome")
    owed = {b for b, o in latest.items() if o != "ok"}

    # First owed brief in cycle order after the anchor
    i = effective.index(anchor)
    for k in range(1, len(effective) + 1):
        cand = effective[(i + k) % len(effective)]
        if cand in owed:
            print(cand)
            return 0
    # Nothing owed: normal advancement
    print(NEXT[anchor])
    return 0


if __name__ == "__main__":
    sys.exit(main())
