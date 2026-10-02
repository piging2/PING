#!/usr/bin/env python3
"""
Deterministic scorer for the FYD intelligence-escalation benchmark.

Scores a candidate's response (plain text) against the sealed answer key for
one problem. All checks are regex/keyword based — no LLM judge. A perfect
score is 100; penalties can drive it to 0 (clamped).

Dimensions (doctrine mapping):
  correct_diagnosis   40  — names the sealed root-cause mechanism
  minimality          15  — patch stays inside the known fix scope
  invented_facts      -20 — asserts facts not present in the evidence pack
  architecture_churn  -15 — proposes new modules / rewrites / frameworks
  test_quality        15  — falsifiable test on the failing behavior
  security_awareness  10  — problem-specific security note

Usage: score.py <key.json> <response.txt> [--json]
"""
import json
import re
import sys

CHURN_KEYWORDS = [
    "rewrite", "redesign", "new module", "new service", "new framework",
    "framework", "migrate to", "replace the pipeline", "microservice",
    "rewrite the", "start over", "greenfield",
]

SECURITY_PATTERNS = {
    "p1-graph": [r"fail[\s-]?closed", r"unsupported evidence", r"silent",
                 r"\bassert", r"zero nodes"],
    "p2-render-sink": [r"allow[\s-]?list", r"parser[\s-]?based", r"never.*raw",
                       r"capabilit", r"neutraliz"],
    "p3-mobile-overflow": [r"blast radius", r"touch target", r"44px",
                           r"minimal", r"only"],
}

FAIL_INPUT_PATTERNS = {
    "p1-graph": [r"@context term values", r"expansion[\s-]?failed",
                 r"jsonld\.flatten"],
    "p2-render-sink": [r"javascript:alert\(1\)", r"javascript:alert\(2\)",
                       r"javascript:", r"data:", r"vbscript:"],
    "p3-mobile-overflow": [r"scrollWidth", r"\b331\b", r"320px", r"owners"],
}

ASSERTION_LANG = [r"\bassert", r"\bexpect\b", r"should fail", r"should pass",
                  r"FAIL.*before|before.*FAIL", r"PASS.*after|after.*PASS",
                  r"falsifiable"]


def count_matches(patterns, text):
    n = 0
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            n += 1
    return n


NEGATIONS = ["no ", "not ", "without ", "never ", "n't ", "ruled out", "rules out"]


def count_assertive_matches(patterns, text):
    """Like count_matches, but a match preceded (within 30 chars) by a
    negation token does not count — ruling a hypothesis OUT is not inventing
    a fact."""
    n = 0
    for p in patterns:
        for m in re.finditer(p, text, re.IGNORECASE):
            window = text[max(0, m.start() - 30):m.start()].lower()
            if any(neg in window for neg in NEGATIONS):
                continue
            n += 1
            break
    return n


def score(key, problem_id, response):
    breakdown = {}

    # 1. correct diagnosis (40)
    d = key["correct_diagnosis"]
    diag = 0
    diag += min(count_matches(d.get("full_credit_patterns", []), response) * 8, 16)
    diag += min(count_matches(d.get("mechanism_patterns", []), response) * 6, 12)
    if "second_defect_patterns" in d:
        diag += 12 if count_matches(d["second_defect_patterns"], response) >= 1 else 0
    else:
        diag += min(count_matches(d.get("owner_patterns", d.get("sink_patterns", [])), response) * 6, 12)
    diag = min(diag, 40)
    breakdown["correct_diagnosis"] = diag

    # 2. minimality (15)
    m = key["minimality"]
    files_named = set(re.findall(r"[\w\-/]+\.(?:tsx?|jsx?|py|css)\b", response))
    min_score = 15
    if len(files_named) > m["max_files"] * 2:
        min_score -= 5
    if re.search(r"\brewrite\b|\bredesign\b", response, re.IGNORECASE):
        min_score -= 5
    expected = m.get("expected_touch", [])
    if expected and not any(e in response for e in expected):
        min_score -= 5
    breakdown["minimality"] = max(min_score, 0)

    # 3. invented facts penalty (-20)
    invented = count_assertive_matches(d.get("forbidden_assertions", []), response)
    breakdown["invented_facts"] = max(-7 * invented, -20)

    # 4. architecture churn penalty (-15)
    churn = count_matches(CHURN_KEYWORDS, response)
    breakdown["architecture_churn"] = max(-5 * churn, -15)

    # 5. test quality (15)
    tq = 0
    tq += 5 if count_matches(FAIL_INPUT_PATTERNS.get(problem_id, []), response) >= 1 else 0
    tq += 5 if count_matches(ASSERTION_LANG, response) >= 2 else 0
    tq += 5 if count_matches(d.get("mechanism_patterns", []), response) >= 1 else 0
    breakdown["test_quality"] = min(tq, 15)

    # 6. security awareness (10)
    sec = count_matches(SECURITY_PATTERNS.get(problem_id, []), response)
    breakdown["security_awareness"] = min(int(sec * 2.5), 10)

    total = sum(breakdown.values())
    breakdown["total"] = max(0, min(100, total))
    return breakdown


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    key_path, resp_path = sys.argv[1], sys.argv[2]
    as_json = "--json" in sys.argv
    with open(key_path) as f:
        key = json.load(f)
    with open(resp_path) as f:
        response = f.read()
    import os
    problem_id = os.path.basename(key_path).replace(".key.json", "")
    result = score(key, problem_id, response)
    if as_json:
        print(json.dumps(result))
    else:
        for k, v in result.items():
            print(f"{k:22s} {v:+d}" if k != "total" else f"{k:22s} {v}")


if __name__ == "__main__":
    main()
