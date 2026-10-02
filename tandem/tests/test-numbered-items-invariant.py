#!/usr/bin/env python3
"""Unit cases for the numbered_items invariant (self-audit 2026-09-19).

RULE: numbered_items must be the parsed business-entry count in the answer
region, never the raw numbered-syntax count across the whole capture.

The old regex (ITEM_RE, not ^-anchored) counted template numbers:
- h-file artifact: 9-10 syntax hits, 5 real businesses (0 of the hits were businesses)
- a-file artifact: 5 syntax hits, 14 real businesses (0 of the hits were businesses)
- it even matched the run timestamp the script itself writes ("04)\n\nMarketing")

The ledger recorded those syntax counts as validation.numbered_items, and the
reconciler certified reports against them, even though the number never
measured businesses. A prompt-only capture with >=3 boilerplate numbers
would pass presence validation with nonzero items: the exact false-success
boundary.
"""
import importlib.util
import os
import re
import sys

TANDEM = os.path.expanduser("~/workspace/tandem")
INTEL = os.path.expanduser(
    "~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel")


def load(name):
    spec = importlib.util.spec_from_file_location(name, f"{TANDEM}/{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    va = load("validate-meta-answer")
    failures = []

    def check(name, cond, detail=""):
        print(("PASS " if cond else "FAIL ") + name + (f" ({detail})" if detail else ""))
        if not cond:
            failures.append(name)

    # Case 1: h-file artifact (real production capture, run 20260919-210415).
    # 5 businesses listed, 0 of them numbered. True count is 5.
    h = open(f"{INTEL}/20260919-210415-h-marketing-intelligence.md", encoding="utf-8").read()
    check("h-artifact entry count == 5", va.count_business_entries(h) == 5,
          f"got {va.count_business_entries(h)}")

    # Case 2: a-file artifact (real production capture, run 20260919-210604).
    # 14 businesses listed, 0 of them numbered. True count is 14.
    a = open(f"{INTEL}/20260919-210604-a-weak-website-hunt.md", encoding="utf-8").read()
    check("a-artifact entry count == 14", va.count_business_entries(a) == 14,
          f"got {va.count_business_entries(a)}")

    # Case 3: prompt-only capture (synthetic). Full prompt echo, contract
    # boilerplate, no answer. Old regex: >=3 syntax hits -> false success.
    # New: 0 entries -> fail closed.
    prompt_only = (
        "# Meta AI intel pass: x-test (20260919 21:04)\n\n"
        "================ OBJECTIVE ================\n"
        "We already know:\n"
        "1. Missed-call text-back is the industry flagship.\n"
        "2. Shared lead marketplaces sell leads at $20-85.\n"
        "3. Review generation is a trigger plus a log.\n"
        "================ OUTPUT CONTRACT ================\n"
        "1. Reply with a numbered list of at least 3 real businesses.\n"
        "2. Your own findings must exceed 1200 characters.\n"
        "3. Never invent a business.\n"
        "4. End with 2-3 sentences on what you could NOT verify.\n"
        "Show thinking\n"
    )
    old_re = re.compile(r"\d{1,2}[.)]\s+[A-Z][\w'&.\-]{2,}")
    check("prompt-only: old regex would false-pass",
          len(old_re.findall(prompt_only)) >= 3,
          f"old regex hits={len(old_re.findall(prompt_only))}")
    check("prompt-only: new count == 0 (fail closed)",
          va.count_business_entries(prompt_only) == 0,
          f"got {va.count_business_entries(prompt_only)}")

    # Case 4: real answer, numbered entries with labeled fields.
    real_answer = (
        "# Meta AI intel pass: x-test (20260919 21:04)\n\n"
        "Show thinking\n"
        "1. Acme Plumbing - Grand Junction - Plumbing\n"
        "Website: https://acmeplumbing.example.com\n"
        "Signal: phone-only contact, no online booking.\n"
        "Verified: live website plus Google Business Profile.\n\n"
        "2. Beta Electric - Delta - Electrician\n"
        "Website: no website found\n"
        "Signal: directory listings only.\n"
        "Verified: namesandnumbers verified listing.\n\n"
        "3. Gamma Roofing - Cortez - Roofer\n"
        "Website: no website found\n"
        "Signal: no web presence at all.\n"
        "Verified: place_id record plus myHomePro listing.\n"
    )
    check("numbered real entries count == 3",
          va.count_business_entries(real_answer) == 3,
          f"got {va.count_business_entries(real_answer)}")

    # Case 5: entries with NO recognized labeled field must not count
    # (matches the contract validator's phantom-entry rule; keeps one
    # shared entry definition across both validators).
    unlabeled = (
        "# Meta AI intel pass: x-test (20260919 21:04)\n\n"
        "Show thinking\n"
        "1. Acme Plumbing - Grand Junction - Plumbing\n"
        "Some freeform note with no label.\n\n"
        "2. Beta Electric - Delta - Electrician\n"
        "Another freeform note.\n"
    )
    check("unlabeled entries count == 0",
          va.count_business_entries(unlabeled) == 0,
          f"got {va.count_business_entries(unlabeled)}")

    # Case 6 (2026-09-24): today's a-artifact. 13 businesses listed as
    # single-line entries whose only inline label is "Weakness:" (plus
    # "no website found" text). LABEL_MAP lacked 'weakness', so only the
    # 3 entries that also carried "Website:" parsed. True count is 13.
    a24 = open(f"{INTEL}/20260924-090654-a-weak-website-hunt.md",
               encoding="utf-8").read()
    check("a-20260924 artifact entry count == 13",
          va.count_business_entries(a24) == 13,
          f"got {va.count_business_entries(a24)}")

    # Case 7 (2026-09-24): today's d-artifact. 12 septic businesses as
    # single-line entries with several inline labels. Must stay 12 after
    # the LABEL_MAP change (regression: no double counting).
    d24 = open(f"{INTEL}/20260924-090420-d-segment-deep-dive.md",
               encoding="utf-8").read()
    check("d-20260924 artifact entry count == 12",
          va.count_business_entries(d24) == 12,
          f"got {va.count_business_entries(d24)}")

    # Case 8 (2026-09-24): synthetic single-line entry carrying ONLY a
    # Weakness: inline label must count as one explicit-labeled entry.
    weakness_only = (
        "# Meta AI intel pass: x-test (20260924 09:24)\n\n"
        "Show thinking\n"
        "Clearly Mechanical - Palisade - Plumbing / HVAC - no website found "
        "- Weakness: no dedicated website, only directory listings.\n"
    )
    check("weakness-only inline entry count == 1",
          va.count_business_entries(weakness_only) == 1,
          f"got {va.count_business_entries(weakness_only)}")

    # Case 9 (2026-09-24): Weakness/Opportunity label (d-brief shape) must
    # also count.
    weakness_opp = (
        "# Meta AI intel pass: x-test (20260924 09:24)\n\n"
        "Show thinking\n"
        "Goodwin Septic - Grand Junction - Septic - no website found "
        "- Weakness/Opportunity: dated one-pager, no online scheduling.\n"
    )
    check("weakness/opportunity inline entry count == 1",
          va.count_business_entries(weakness_opp) == 1,
          f"got {va.count_business_entries(weakness_opp)}")

    # Case 10 (2026-10-01): b-radar artifact 20261001-090412. 10 real
    # numbered entries whose labels are the b-brief's own style
    # ("Evidence new:", "Contact:", "Weak signal:") rather than the
    # LABEL_MAP families ('verified', 'website', 'weakness'). The
    # phantom-entry guard dropped every entry -> 0 -> CAPTURE_FAILED
    # for a genuinely valid answer. True count is 10.
    b1 = open(f"{INTEL}/20261001-090412-b-new-business-radar.md.CAPTURE_FAILED",
              encoding="utf-8").read()
    check("b-20261001-090412 artifact entry count == 10",
          va.count_business_entries(b1) == 10,
          f"got {va.count_business_entries(b1)}")

    # Case 11 (2026-10-01): b-radar artifact 20261001-030650. 10 real
    # entries in BARE (unnumbered) header style, each followed by a
    # single "Evidence new:" line. Same root cause, same false
    # negative. True count is 10.
    b2 = open(f"{INTEL}/20261001-030650-b-new-business-radar.md.CAPTURE_FAILED",
              encoding="utf-8").read()
    check("b-20261001-030650 artifact entry count == 10",
          va.count_business_entries(b2) == 10,
          f"got {va.count_business_entries(b2)}")

    # Case 12 (2026-10-01): synthetic b-style entry carrying the three
    # new label families must count as one explicit-labeled entry.
    bstyle = (
        "# Meta AI intel pass: x-test (20261001 09:04)\n\n"
        "Show thinking\n"
        "1. Kooler Garage Doors - Grand Junction - Garage Door\n\n"
        "Evidence new: chamber ribbon cutting set for Nov 10.\n"
        "Contact: koolergaragedoors.com, (970) 660-3456\n"
        "Weak signal: phone-only quote flow, no online booking.\n"
    )
    check("b-style labeled entry count == 1",
          va.count_business_entries(bstyle) == 1,
          f"got {va.count_business_entries(bstyle)}")

    # Case 13 (2026-10-01): phantom-entry rule still holds after the
    # LABEL_MAP extension. A title-shaped line with a freeform note
    # (no recognized labeled field) must not count.
    phantom = (
        "# Meta AI intel pass: x-test (20261001 09:04)\n\n"
        "Show thinking\n"
        "Signals - Phone/Response - Window\n"
        "Some freeform note with no label.\n"
    )
    check("phantom title entry count == 0",
          va.count_business_entries(phantom) == 0,
          f"got {va.count_business_entries(phantom)}")

    print()
    if failures:
        print(f"{len(failures)} FAILED: {failures}")
        return 1
    print("all unit cases pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
