# Memory-to-execution gap: IG "no post link found" (closed 2026-09-24)

## The gap
- 2026-09-21: lesson recorded in ~/AGENTS.md: never trust a CDP "no business
  keywords" / "no post link found" near-miss at face value; verify gate-passed
  handles with `instagram-cli user-profile` and pull the post URL with
  `instagram-cli posts --username`. The funnel's empty streaks (passes 88-92)
  were misclassified as genuine-empty.
- The lesson was recorded, but nothing consumed it. ig-discover.js carried a
  comment claiming a worker followed up on near-misses; no worker, cron, or
  consumer actually did. near_misses were written to result JSONs and read by
  nothing that acted on them.
- Phase A2 received only already gate-passed candidates, so rejected handles
  stranded in the skip list with no recovery path.
- Missing policy and test: no invariant forbade a durable skip from weak DOM
  evidence; no positive controls; the skip list accepted "no post link found"
  as a reason without any second look.

## Falsification (2026-09-24)
- 49 near-misses replayed via instagram-cli: 10 RECOVERED_CANDIDATE
  (real businesses with real posts), 36 confirmed exclusions with real
  evidence, 1 genuinely empty, 2 still unknown.
- Example: @scenicstudiosalons was rejected for "no post link found" while
  having 31 posts and a 2026-09-20 post. The gate measured DOM surface drift,
  not feed emptiness.

## Prevention now in place (all local, tested)
1. Status typing (ig-observation.js): "no post link found" maps to
   FOLLOWUP_REQUIRED, never OBSERVED_EMPTY. Missing /p/ or /reel/ anchors are
   an extraction failure, not a post count.
2. CLI reconciliation (ig-nearmiss-followup.js) runs before any skip decision:
   user-profile + posts, fail closed to STILL_UNKNOWN.
3. skipEligible gate (ig-disposition.js): only CONFIRMED_EXCLUDE /
   CONFIRMED_EMPTY enter the skip list. UNKNOWN never becomes a permanent
   reject.
4. Positive controls (ig-positive-controls.json): a pass that cannot
   rediscover its known-good handles may not conclude GENUINE_EMPTY; EMPTY
   conclusions are downgraded to STILL_UNKNOWN.
5. Bounded follow-up: --max-handles / --time-budget-secs; budget exhaustion
   defers to the next pass, never skips, never hangs a pass.
6. Regression suite (ig-observation.test.js, 23 checks) pins every invariant.
7. Consumer wired: run_ig_discover.sh now runs the follow-up after every
   result retrieval and writes a reconciliation file; ig-apply-reconciliation.py
   is the single writer of the skip list from reconciled outcomes only.

## Cohort replay (Nolan 2026-09-24)
153 defect-affected handles (rejected on the broken firstPost condition across
the streak, excluding the 41 already experimented) replayed and classified as
exactly one of RECOVERED_CANDIDATE / LEGITIMATE_REJECT / STILL_UNKNOWN.
History preserved per entry in the skip ledger; UNKNOWN never skips.

Final replay counts: replayed 153 / recovered 14 / legitimate reject 69 /
unknown 70. Combined with the 41-handle experiment: 194 classified, 24
recovered, 99 legitimate rejects, 72 unknown pending. Skip list at
engagement-passes/ig-skip-list-20260924-1805.json (423 entries, verified:
69/69 rejects present with evidence, 0 unknown/recovered present). Full
report: ig-replay-report-2026-09-24.md.
