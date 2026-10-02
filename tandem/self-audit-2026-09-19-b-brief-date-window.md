# Self-audit 2026-09-19: b-brief formation-date self-consistency invariant

## The reasoning that keeps recurring

Every b-new-business-radar cycle, the agent manually excludes Meta AI items whose
own quoted formation dates fall far outside the brief's 60-90 day window, AFTER
those items already passed contract validation (numbered_items counts them).

Production evidence (three consecutive b-brief cycles):
- 2026-09-19 run 20260919-090444: 2 of 10 items self-quote 2025 dates
  (JK Lawncare LLC "Formed August 27, 2025"; OT Electric LLC "Formed July 1, 2025").
  Both verified real via independent CDOS-derived search, both 13-14 months old,
  both excluded from the radar tag at distill time. Contract validation PASSED
  the answer (23 numbered items) because it counts items without checking the
  dates they carry.
- 2026-09-18 distill note (answer 20260917-210418): "4 verified real but not
  new-filings" - same pattern, manual exclusion after contract pass.
- 2026-09-18 round-84 ingest (answer 20260918-150420): 6 items audited,
  window-fail items again present among contract-validated items.

Pattern: roughly 20-40% of b-brief items are window-fail on their OWN evidence.
They pass the gate, consume verification searches, and die at distill.

## The invariant (precise)

For brief_id == b-new-business-radar: an item's "new" claim is only
machine-supported if every formation date quoted in that item falls inside
[run_date - 90 days, run_date - 60 days]. An item whose resolvable formation
date is older than 90 days before the run date is WINDOW_FAIL and does not
count toward the contract's "at least 3 real businesses" minimum. An item with
no resolvable date stays UNKNOWN and still counts (missing evidence is not
negative evidence; never infer failure from absence).

## Unit cases

run_date = 2026-09-19 in all cases.
1. "JK Lawncare, LLC - Grand Junction - Landscaping / Formed August 27, 2025"
   -> WINDOW_FAIL (388 days old).
2. "BDK Properties LLC - Montrose - Property services / Form Date 2026-07-19"
   -> WINDOW_OK (62 days).
3. "Some Business - No date anywhere in the entry" -> UNKNOWN (counts).
4. "Formed July 2026" -> WINDOW_OK (mid-month fallback 2026-07-15 = 66 days).
5. "Formed 2026-06-10" -> WINDOW_FAIL (101 days).
6. "Formed 2026-08-20" (30 days) -> WINDOW_OK: the brief asks for "last
   60-90 days" but recency inside 60 days is strictly fresher signal, never
   a failure; the fail condition is ONLY age > 90 days.

## Automation sketch (proposed, not yet applied)

Extend validate-research-contract.py: after the existing per-entry extraction,
run a b-brief-only date pass reusing the existing parse_timing() absolute-date
branches (YYYY-MM-DD, "Month D, YYYY", "Month YYYY" mid-month fallback).
Add report field formation_window = {"ok": n, "window_fail": n, "unknown": n}.
Gate: entries counting toward the minimum must be ok-or-unknown >= 3; a
window_fail item is excluded from the valid count. This RAISES the gate, so
the change must be reviewed before it alters pass/fail behavior - recorded
here first per the self-improvement protocol.

## Why not also promote the dedup-source observation

The distill found 12 of 17 items duplicated in pipeline.md while the pack's
negative signals (built from the canonical JSONL) listed only 1. That is a
real coverage gap, but it touches the negative-signal authority boundary
(canonical JSONL vs full pipeline digest), which is an operator-level decision
about PING knowledge authority, not a safe unilateral promotion. Flagged in
the run report instead.
