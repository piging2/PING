#!/usr/bin/env python3
"""Objective/contract compatibility gate (self-audit 2026-09-20).

Deterministic rule: a non-prospect-list objective must fail validation
before dispatch when paired with a business-list output contract.

Production evidence:
- Round 94: h-marketing-intelligence asked for marketing TACTICS
  (sections A-D); Meta AI answered with businesses instead.
- Run 20260920-030848-h (2026-09-19): h answered prose with zero numbered
  items; presence validation failed closed (second instance).
- Run 20260920-210422-h (2026-09-20): h answered 6 numbered BUSINESSES
  instead of sections A-D. Root cause: meta-pass.sh appends the same
  OUTPUT CONTRACT to every brief, and contract line 1 demands "a numbered
  list of at least N real businesses". The model obeys the contract (the
  contract declares itself authoritative), so the objective fails while
  the presence validator passes.

The prospect-list briefs are a closed, EXPLICIT set. The prompt owner adds
a slug to PROSPECT_LIST_SLUGS (or ships a per-brief contract with its own
output directives in contracts/<slug>.json) when a new prospect-list brief
is created. Every other brief fails this gate until that decision is made
explicitly. The gate never silently passes: if meta-pass.sh stops emitting
the business-list directive, the gate reports infra so its own assumption
is audited instead of going vacuous.

Usage: check-objective-contract.py <slug>
Exit codes: 0 = compatible (dispatch may proceed), 3 = incompatible
(fail closed: do not dispatch), 2 = infra/usage error.
"""
import os
import re
import sys

TANDEM = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(TANDEM, "prompts")
META_PASS = os.path.expanduser("~/workspace/pig-fb/meta-pass.sh")

# Closed explicit set of prospect-list objectives. Decision authority: the
# prompt owner (per self-audit 2026-09-19). Adding a slug here declares the
# brief a prospect-list objective; nothing else may.
PROSPECT_LIST_SLUGS = {
    "a-weak-website-hunt",
    "b-new-business-radar",
    "c-review-complaint-signals",
    "d-segment-deep-dive",
}

BUSINESS_LIST_DIRECTIVE_RE = re.compile(
    r"numbered list of at least .* real businesses", re.I)


def contract_has_business_list():
    """True if meta-pass.sh still assembles the business-list OUTPUT
    CONTRACT. Returns None when the script cannot be read."""
    try:
        text = open(META_PASS, encoding="utf-8").read()
    except OSError:
        return None
    return bool(BUSINESS_LIST_DIRECTIVE_RE.search(text))


def prompt_exists(slug):
    return os.path.isfile(os.path.join(PROMPTS, slug + ".md"))


def check(slug):
    """Return (verdict, message). Verdict is one of 'compatible',
    'incompatible', 'infra'."""
    if not slug or not prompt_exists(slug):
        return ("infra", f"prompt file not found: prompts/{slug}.md")
    has_directive = contract_has_business_list()
    if has_directive is None:
        return ("infra",
                "cannot read pig-fb/meta-pass.sh; cannot confirm the OUTPUT "
                "CONTRACT shape")
    if not has_directive:
        return ("infra",
                "meta-pass.sh no longer emits the business-list OUTPUT "
                "CONTRACT directive; this gate's pairing assumption is "
                "stale. Review check-objective-contract.py before dispatching.")
    if slug in PROSPECT_LIST_SLUGS:
        return ("compatible",
                f"{slug}: prospect-list objective paired with the "
                "business-list OUTPUT CONTRACT; dispatch may proceed")
    return ("incompatible",
            f"{slug}: objective is not a prospect-list objective, but the "
            "assembled OUTPUT CONTRACT demands a numbered list of real "
            "businesses. Refusing dispatch. Fix one side explicitly: add "
            "the slug to PROSPECT_LIST_SLUGS in "
            "tandem/check-objective-contract.py if the brief really is a "
            "prospect-list objective, or give the brief its own output "
            "directives via contracts/<slug>.json prompt_block and remove "
            "the generic business-list line for it.")


def main():
    if len(sys.argv) != 2:
        print("usage: check-objective-contract.py <slug>", file=sys.stderr)
        return 2
    verdict, message = check(sys.argv[1])
    print(f"{verdict}: {message}")
    return {"compatible": 0, "incompatible": 3, "infra": 2}[verdict]


if __name__ == "__main__":
    sys.exit(main())
