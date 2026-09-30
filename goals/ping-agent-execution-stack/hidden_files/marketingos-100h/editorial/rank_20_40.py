#!/usr/bin/env python3
"""MarketingOS 100h, Block 20-40: deterministic editorial ranking projection.

A PLAIN FUNCTION over the block 0-20 findings. Not a new authority, not a new
store, not a writer of policy. Scores RECOMMEND, never authorize.

Determinism contract:
  - The rubric weights are fixed below.
  - The 0-5 dimension ratings are the coordinator's editorial input, committed
    verbatim in FINDINGS. They are judgment; the FUNCTION over them is
    deterministic: same fixture + same weights -> same ranking, always.
  - Ties break by claim id ascending (C2 before C6, etc.).
  - The script prints the sha256 of the canonical fixture so any rerun can be
    checked against the committed input.

Dimensions (0-5 each):
  audience_value : how much this matters to a skeptical senior engineer's work
                   (data integrity, sealing audit journals, privilege design).
  disagreeability: can a good engineer argue with it / is it surprising?
  defensibility  : strength of the evidence (direct trial + docs > inspection).
  freshness      : how new is this to the informed practitioner?

score = 3*audience_value + 2*disagreeability + 3*defensibility + 1*freshness
max = 45.
"""
import hashlib
import json
import sys

WEIGHTS = {"audience_value": 3, "disagreeability": 2, "defensibility": 3, "freshness": 1}

# Coordinator editorial input, committed verbatim. The function below is
# deterministic over this fixture; the fixture itself is judgment.
FINDINGS = [
    {
        "claim": "C1",
        "verdict": "CONFIRMED",
        "summary": "Non-superuser, read-only default, fresh session: INSERT -> ERROR.",
        "evidence": "T1",
        "ratings": {"audience_value": 2, "disagreeability": 1, "defensibility": 5, "freshness": 1},
        "rating_notes": "Baseline/control. Everyone assumes it; nobody disputes it.",
    },
    {
        "claim": "C2",
        "verdict": "CONFIRMED",
        "summary": "SET default_transaction_read_only=off or START TRANSACTION READ WRITE restores writes: it is a default, not a boundary.",
        "evidence": "T2, T3 + PG16 docs",
        "ratings": {"audience_value": 5, "disagreeability": 5, "defensibility": 5, "freshness": 4},
        "rating_notes": "The core production misconception: teams treat the ALTER ROLE default as a seal.",
    },
    {
        "claim": "C3",
        "verdict": "REFUTED-as-worded (refined)",
        "summary": "CREATE TEMP TABLE FAILS read-only; DML on an already-existing temp table IS allowed read-only (INSERT, COPY FROM verified).",
        "evidence": "T4, T11 + docs",
        "ratings": {"audience_value": 4, "disagreeability": 4, "defensibility": 5, "freshness": 5},
        "rating_notes": "Secondary sources overstate the exemption (K1). Narrow but genuinely fresh boundary detail.",
    },
    {
        "claim": "C4",
        "verdict": "CONFIRMED",
        "summary": "SELECT nextval(seq) -> ERROR in read-only transactions.",
        "evidence": "T5",
        "ratings": {"audience_value": 2, "disagreeability": 2, "defensibility": 5, "freshness": 3},
        "rating_notes": "Niche. Sequence consumers only; mildly surprising.",
    },
    {
        "claim": "C5",
        "verdict": "CONFIRMED",
        "summary": "pg_advisory_lock/unlock and LISTEN/NOTIFY function normally in read-only transactions.",
        "evidence": "T6, T7",
        "ratings": {"audience_value": 3, "disagreeability": 3, "defensibility": 5, "freshness": 4},
        "rating_notes": "Useful for lock-based coordination under read-only roles; surprises people who read 'read-only' as 'blocks everything'.",
    },
    {
        "claim": "C6",
        "verdict": "CONFIRMED",
        "summary": "Superuser is bound by the default in a fresh session but bypasses it at will via SET.",
        "evidence": "T9a, T9b",
        "ratings": {"audience_value": 5, "disagreeability": 5, "defensibility": 5, "freshness": 4},
        "rating_notes": "The dangerous one: 'our superuser role is read-only sealed' is not a privilege-layer truth. Our own retirement doc over-claimed here (K2).",
    },
    {
        "claim": "C7",
        "verdict": "CONFIRMED",
        "summary": "REVOKE INSERT/UPDATE/DELETE/TRUNCATE on a non-superuser blocks writes even under explicit READ WRITE: privilege revocation is a real boundary.",
        "evidence": "T10",
        "ratings": {"audience_value": 5, "disagreeability": 4, "defensibility": 5, "freshness": 4},
        "rating_notes": "The actionable fix. The default-vs-revoke contrast is the punchline; REVOKE itself is standard practice (docs).",
    },
    {
        "claim": "C8",
        "verdict": "CONFIRMED",
        "summary": "Oracle (ping-core-01) matches the claimed seal config exactly, verified read-only. Residual risk: app discipline + triggers, not a privilege boundary.",
        "evidence": "read-only inspection, zero write attempts",
        "ratings": {"audience_value": 2, "disagreeability": 1, "defensibility": 4, "freshness": 0},
        "rating_notes": "Internal config; zero novelty for an external reader. Its value is as the honesty anchor, not the headline.",
    },
]

EXPECTED_TOTALS = {
    "C1": 24, "C2": 44, "C3": 40, "C4": 28,
    "C5": 34, "C6": 44, "C7": 42, "C8": 20,
}


def score(finding):
    r = finding["ratings"]
    return sum(WEIGHTS[k] * r[k] for k in WEIGHTS)


def rank(findings):
    scored = [(score(f), f) for f in findings]
    scored.sort(key=lambda pair: (-pair[0], pair[1]["claim"]))
    return scored


def fixture_sha():
    canonical = json.dumps(FINDINGS, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def main():
    # Self-test: the function's arithmetic must match the committed expectations.
    for f in FINDINGS:
        got = score(f)
        want = EXPECTED_TOTALS[f["claim"]]
        assert got == want, f"score mismatch {f['claim']}: got {got}, want {want}"
    print("SELF_TEST_OK arithmetic matches committed expected totals")

    sha = fixture_sha()
    print(f"FIXTURE_SHA256 {sha}")

    ranked = rank(FINDINGS)
    print("\nRANKING (score = 3*audience + 2*disagreeability + 3*defensibility + 1*freshness, max 45)")
    print(f"{'rank':<5}{'claim':<7}{'total':<7}{'aud':<5}{'dis':<5}{'def':<5}{'fre':<5}summary")
    for i, (total, f) in enumerate(ranked, 1):
        r = f["ratings"]
        print(
            f"{i:<5}{f['claim']:<7}{total:<7}{r['audience_value']:<5}{r['disagreeability']:<5}"
            f"{r['defensibility']:<5}{r['freshness']:<5}{f['summary']}"
        )

    result = {
        "fixture_sha256": sha,
        "weights": WEIGHTS,
        "ranking": [
            {"rank": i, "claim": f["claim"], "verdict": f["verdict"], "total": total,
             "ratings": f["ratings"], "evidence": f["evidence"]}
            for i, (total, f) in enumerate(ranked, 1)
        ],
    }
    print("\nRANKING_JSON")
    print(json.dumps(result, indent=1))
    return result


if __name__ == "__main__":
    main()
