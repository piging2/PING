#!/usr/bin/env python3
"""Fail-before unit cases for the objective/contract compatibility gate.

RULE (self-audit 2026-09-20): a non-prospect-list objective must fail
validation before dispatch when paired with a business-list output contract.

Production evidence:
- Round 94 (ingested.log, reliability data point 9): h-marketing-intelligence
  asked for marketing TACTICS (sections A-D); Meta AI answered with businesses.
- Run 20260920-030848-h (2026-09-19): h answered prose with ZERO numbered
  items; presence validation failed closed (2nd instance, no machinery change).
- Run 20260920-210422-h (2026-09-20): h answered 6 numbered BUSINESSES instead
  of sections A-D. Root cause: meta-pass.sh appends the same OUTPUT CONTRACT
  to every brief, and contract line 1 demands "a numbered list of at least N
  real businesses". The model obeys the contract (the contract says it is
  authoritative), so the objective fails while the validator passes. This is
  the THIRD h-brief contract violation, the trigger the 2026-09-19 audit set
  for hardening.

The gate: check-objective-contract.py <slug> exits 0 when the pairing is
compatible, 3 when a non-prospect-list objective would be dispatched with the
business-list OUTPUT CONTRACT (fail closed, no dispatch), 2 on infra.
"""
import importlib.util
import os
import sys

TANDEM = os.path.expanduser("~/workspace/tandem")


def load():
    spec = importlib.util.spec_from_file_location(
        "check_objective_contract", f"{TANDEM}/check-objective-contract.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    gate = load()
    failures = []

    def check(name, cond, detail=""):
        print(("PASS " if cond else "FAIL ") + name +
              (f" ({detail})" if detail else ""))
        if not cond:
            failures.append(name)

    # Case 1 (the fail-before case): h-marketing-intelligence is a
    # marketing-intel objective, not a prospect list. Paired with the
    # business-list OUTPUT CONTRACT it must be INCOMPATIBLE. Before this
    # gate existed it dispatched and burned a run producing businesses
    # instead of sections A-D.
    verdict, msg = gate.check("h-marketing-intelligence")
    check("h-brief is incompatible", verdict == "incompatible",
          f"got {verdict}")
    check("h-brief message names the fix",
          "PROSPECT_LIST_SLUGS" in msg and "contracts/" in msg, msg[:80])

    # Case 2: the four prospect-list briefs are compatible with the
    # business-list OUTPUT CONTRACT.
    for slug in ("a-weak-website-hunt", "b-new-business-radar",
                 "c-review-complaint-signals", "d-segment-deep-dive"):
        verdict, _ = gate.check(slug)
        check(f"{slug} is compatible", verdict == "compatible",
              f"got {verdict}")

    # Case 3: the other intel briefs (seasonal calendar, network scans,
    # weekend scan, clowning) are also non-prospect-list objectives; they
    # would hit the same defect if dispatched with the business-list
    # contract.
    for slug in ("e-seasonal-demand-calendar", "f-trade-network-scan",
                 "g-local-network-opportunities", "i-gj-weekend-scan",
                 "j-clowning-pattern-mining", "k-clowning-distribution"):
        verdict, _ = gate.check(slug)
        check(f"{slug} is incompatible", verdict == "incompatible",
              f"got {verdict}")

    # Case 4: the gate must not become silently vacuous. If meta-pass.sh
    # stops emitting the business-list directive, the gate reports infra
    # instead of passing everything.
    real = gate.contract_has_business_list()
    check("meta-pass.sh currently emits the business-list directive",
          real is True, f"got {real}")
    gate.__dict__["_directive_override"] = False
    orig = gate.contract_has_business_list
    gate.contract_has_business_list = lambda: False
    try:
        verdict, msg = gate.check("h-marketing-intelligence")
        check("stale-directive reports infra, not pass",
              verdict == "infra", f"got {verdict}")
    finally:
        gate.contract_has_business_list = orig

    # Case 5: unknown slug is infra, never a silent pass.
    verdict, _ = gate.check("zzz-no-such-brief")
    check("unknown slug is infra", verdict == "infra", f"got {verdict}")

    if failures:
        print(f"\n{len(failures)} FAILURES: " + ", ".join(failures))
        return 1
    print("\nall checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
