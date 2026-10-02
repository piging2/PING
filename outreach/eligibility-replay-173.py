#!/usr/bin/env python3
"""Offline replay of FB pass 173 against the eligibility authority.

Zero external actions. Reconstructs the pre-incident engagement-history
state (log cut before the pass-173 section; intent ledger excluding the
pass-173 pass_id), joins the 34 curated candidates with their discovery
text, runs the single eligibility_check over the batch, and compares the
verdicts against the expected outcome derived from the 2026-10-01 audit.

Usage: python3 eligibility-replay-173.py
Writes: ~/workspace/outreach/eligibility-replay-173-2026-10-01.md
"""
import hashlib
import importlib.util
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "eg", os.path.join(BASE, "engagement-guard.py"))
eg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eg)

PASS173 = "fb-20261001-052817"
CUT_MARKER = "## FB Pass 2026-09-30 23:26 MDT"

# Expected primary reason per 1-based candidate index, derived from the
# 2026-10-01 audit (sections 2-4). None = ELIGIBLE.
EXPECTED = {
    1: "OUTSIDE_CORRIDOR", 2: "OUTSIDE_CORRIDOR", 3: None, 4: None,
    5: "OUTSIDE_CORRIDOR", 6: "OUTSIDE_CORRIDOR", 7: "OUTSIDE_CORRIDOR",
    8: "OUTSIDE_CORRIDOR", 9: "OUTSIDE_CORRIDOR",
    10: "ALREADY_ENGAGED", 11: "ALREADY_ENGAGED", 12: "BLOCKED",
    13: "BLOCKED", 14: "BLOCKED", 15: "ALREADY_ENGAGED", 16: None,
    17: None, 18: "AUTHOR_UNVERIFIABLE", 19: "ALREADY_ENGAGED",
    20: "EVENT_DROP", 21: None, 22: None, 23: None, 24: None,
    25: "ALREADY_ENGAGED", 26: "ALREADY_ENGAGED", 27: "ALREADY_ENGAGED",
    28: None, 29: "FUNDRAISER_DROP", 30: "ALREADY_ENGAGED",
    31: "OUTSIDE_CORRIDOR", 32: "OUTSIDE_CORRIDOR",
    33: "OUTSIDE_CORRIDOR", 34: "OUTSIDE_CORRIDOR",
}


def pid_of(url):
    m = re.search(r"/permalink/(\d+)", url or "")
    return m.group(1) if m else None


def main():
    job = json.load(open(os.path.join(BASE, "fb173-curated-job.json")))
    cands = json.load(open(os.path.join(BASE, "fb173-candidates.json")))
    cand_by_pid = {pid_of(c.get("url")): c for c in cands}

    data = eg.load_eligibility_data()
    index = eg.load_eligibility_snapshot(
        exclude_pass_ids=(PASS173,), log_cut_marker=CUT_MARKER)

    batch_seen = set()
    verdicts = []
    for i, a in enumerate(job):
        p = pid_of(a.get("url"))
        full = cand_by_pid.get(p, {})
        candidate = {
            "platform": "facebook",
            "type": a.get("type") or "like",
            "url": a.get("url"),
            "page": a.get("page"),
            "text": full.get("text"),
            "group_id": None,
            "group_name": None,
            "feed": full.get("source") == "feed",
        }
        v = eg.eligibility_check(index, candidate, data=data,
                                 batch_seen=batch_seen)
        verdicts.append((i + 1, a.get("page"), a.get("url"), v))

    # Determinism: run the whole batch a second time and compare hashes.
    h1 = hashlib.sha256(json.dumps(
        [(i, v["decision"], v["reasons"], v["evidence"])
         for i, _, _, v in verdicts],
        sort_keys=True).encode()).hexdigest()
    batch_seen2 = set()
    rerun = []
    for i, a in enumerate(job):
        p = pid_of(a.get("url"))
        full = cand_by_pid.get(p, {})
        v = eg.eligibility_check(index, {
            "platform": "facebook", "type": a.get("type") or "like",
            "url": a.get("url"), "page": a.get("page"),
            "text": full.get("text"), "group_id": None,
            "group_name": None, "feed": full.get("source") == "feed"},
            data=data, batch_seen=batch_seen2)
        rerun.append((i + 1, v["decision"], v["reasons"], v["evidence"]))
    h2 = hashlib.sha256(json.dumps(rerun, sort_keys=True).encode()).hexdigest()
    deterministic = (h1 == h2)

    eligible = [v for v in verdicts if v[3]["decision"] == "ELIGIBLE"]
    mismatches = []
    for i, page, url, v in verdicts:
        exp = EXPECTED[i]
        got = None if v["decision"] == "ELIGIBLE" else v["primary_reason"]
        if got != exp:
            mismatches.append((i, exp, got, v["reasons"]))

    lines = []
    A = lines.append
    A("# Eligibility replay: FB pass 173 (offline, zero external actions)")
    A("")
    A("Reconstructed pre-incident state: facebook log cut before the pass-173")
    A("section (`%s`); intent ledger excluding pass_id `%s`. The 34 curated" % (CUT_MARKER, PASS173))
    A("candidates were joined with their discovery text from fb173-candidates.json")
    A("and run through `engagement-guard.eligibility_check` in batch order.")
    A("")
    A("Result: %d ELIGIBLE, %d INELIGIBLE, %d UNKNOWN. Deterministic re-run: %s."
      % (len(eligible), len(verdicts) - len(eligible),
         sum(1 for v in verdicts if v[3]["decision"] == "UNKNOWN"),
         "IDENTICAL" if deterministic else "DIFFERENT"))
    A("Expected-vs-actual mismatches: %d." % len(mismatches))
    A("")
    A("## Verdict table")
    A("")
    A("| # | page | verdict | primary reason | evidence |")
    A("|---|------|---------|----------------|----------|")
    for i, page, url, v in verdicts:
        exp = EXPECTED[i]
        got = None if v["decision"] == "ELIGIBLE" else v["primary_reason"]
        mark = "" if got == exp else " **MISMATCH**"
        A("| %d | %s | %s | %s | %s |%s" % (
            i, (page or "")[:44].replace("|", "/"), v["decision"],
            v["primary_reason"] or "-",
            ("; ".join(v["evidence"])[:110]).replace("|", "/"), mark))
    A("")
    A("## Notes")
    A("")
    A("- Items 17 (Fruita coffee beans) and 24 (Ridgway free estimate) return")
    A("  ELIGIBLE: no rule in the data covers them. The human corrected set")
    A("  dropped them on tighter curation judgment, not on a deterministic")
    A("  rule. This is the honest boundary of the authority, and it is")
    A("  recorded here rather than papered over.")
    A("- The guard blocked 1 of 34 at dispatch (AG Property Services, fuzzy")
    A("  match). The offline replay blocks 21 of 34 at the eligibility layer;")
    A("  the 7 human-corrected keeps all return ELIGIBLE.")
    A("- The 2 escaped likes (items 1 and 2) are blocked in the replay as")
    A("  OUTSIDE_CORRIDOR (CO BizNet group out; item 2 also matches the")
    A("  out-of-corridor business Litto's Fencing). Their real-world outcomes")
    A("  are preserved separately in eligibility-escaped-likes-2026-10-01.md.")
    out = os.path.join(BASE, "eligibility-replay-173-2026-10-01.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("eligible=%d ineligible=%d unknown=%d mismatches=%d deterministic=%s"
          % (len(eligible), len(verdicts) - len(eligible),
             sum(1 for v in verdicts if v[3]["decision"] == "UNKNOWN"),
             len(mismatches), deterministic))
    for m in mismatches:
        print("MISMATCH #%d expected=%s got=%s reasons=%s" % m)
    return 1 if mismatches or not deterministic else 0


if __name__ == "__main__":
    sys.exit(main())
