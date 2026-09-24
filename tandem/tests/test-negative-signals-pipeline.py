#!/usr/bin/env python3
"""Unit cases for the negative-signals-pipeline invariant (self-audit 2026-09-23).

RULE: the context pack's negative-signal list must include pipeline.md staged
NEW/QUEUED rows carrying the brief's source/intel markers, merged with the
JSONL coverage and deduped.

Production evidence (run 20260923-090419-a-weak-website-hunt): Meta AI
re-served 7 of 12 already-tracked names. 4 of them are pipeline-staged rows
with a-brief/weak-website markers that the JSONL-only negative list missed:
- Palisade Electric Service (pipeline staged, source=meta-ai-intel a-brief)
- Absolute Heat & Air (pipeline staged, source=meta-ai-intel a-brief;
  the same run also re-served its REFUTED Wix URL gluke2758.wixsite.com,
  proven a Kansas City MO false match on 2026-09-22)
- O'Neill Heating and Plumbing LLC (pipeline staged, source=meta-ai-intel a-brief)
- Four Seasons Plumbing Heating (pipeline staged, distill sweep 2026-09-22,
  source=meta-ai-intel a-weak-website-hunt)

Residual (noted, not covered by this invariant): Golden Eagle Pest Control
(staged via WCO pest segment research, no brief markers), Mesa Door Systems
(staged via pre-brief meta-ai round 82), Reliable Pest Control (near-miss
prose only, never staged).
"""
import importlib.util
import os
import sys

TANDEM = os.path.expanduser("~/workspace/tandem")


def load(name):
    spec = importlib.util.spec_from_file_location(name, f"{TANDEM}/{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    bcp = load("build-context-pack")
    # Contract update 2026-09-24: the negative-signal derivation moved to
    # covered_names.py (tuple API: (name, town)). This audit keeps its
    # invariant - staged brief-marker rows must appear in the merged
    # negative list - and asserts it against the new API.
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location("covered_names", f"{TANDEM}/covered_names.py")
    cn = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(cn)
    failures = []

    def check(name, cond, detail=""):
        print(("PASS " if cond else "FAIL ") + name + (f" ({detail})" if detail else ""))
        if not cond:
            failures.append(name)

    # Case 1: parse_staged_row matches real staging rows (tuple API).
    check("NEW row parses",
          cn.parse_staged_row("- NEW | Absolute Heat & Air | HVAC | Montrose | ...") == ("Absolute Heat & Air", "Montrose"))
    check("QUEUED row parses",
          cn.parse_staged_row("- QUEUED (2026-09-25 UTC cold slot 8, draft x.md) | Curbside Cleaners | window | GJ | ...") == ("Curbside Cleaners", "GJ"))
    check("bold name unbolded",
          cn.parse_staged_row("- NEW | **Four Seasons Plumbing Heating** | plumbing | Clifton | ...") == ("Four Seasons Plumbing Heating", "Clifton"))

    # Case 2: parse_staged_row rejects prose mentions and near-miss notes.
    check("prose mention rejected",
          cn.parse_staged_row("- **Four Seasons Plumbing Heating** | plumbing / HVAC | Clifton (468 Carson Lake Dr)") is None)
    check("near-miss note rejected",
          cn.parse_staged_row("- Near-misses and exclusions (round 112 a-file): Janik Electric Clifton (license EC.0006278 active ...)") is None)
    check("plain prose rejected",
          cn.parse_staged_row("JSONL NOT touched (305 rows, at cap); b-file rows already pipeline-staged.") is None)

    # Case 3: production evidence - the 4 re-served staged names appear in the
    # merged a-brief negative list (live pipeline.md; rows are append-only).
    merged = cn.merged_covered_names("a-weak-website-hunt")
    low = [nm.lower() for nm, _ in merged]
    for nm in ["absolute heat & air", "palisade electric service",
               "o'neill heating and plumbing llc", "four seasons plumbing heating"]:
        check(f"a-brief negative list contains '{nm}'",
              any(nm in n for n in low), f"merged={len(merged)}")

    # Case 4: dedupe - no case-insensitive duplicate bare names in merged list.
    bare = [nm.strip().lower() for nm, _ in merged]
    check("merged list has no duplicate bare names", len(bare) == len(set(bare)),
          f"len={len(merged)} unique={len(set(bare))}")

    # Case 5: pipeline extras never duplicate a JSONL-covered name.
    jsonl = cn.covered_names_jsonl("a-weak-website-hunt")
    jsonl_bare = {nm.strip().lower() for nm, _ in jsonl}
    pipe = cn.covered_names_pipeline("a-weak-website-hunt")
    check("pipeline extras are JSONL-disjoint",
          all(nm.lower() not in jsonl_bare for nm, _ in pipe),
          f"pipe={len(pipe)}")

    # Case 6: c-brief (quarantined, no marker rows in production data) yields [].
    check("c-brief pipeline extras empty",
          cn.covered_names_pipeline("c-review-complaint-signals") == [])

    # Case 7: unknown slug yields [] (fail-closed on marker config).
    check("unknown slug yields []",
          cn.covered_names_pipeline("z-nonexistent") == [])

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all unit cases pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
