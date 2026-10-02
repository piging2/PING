# IG defect-cohort replay report (2026-09-24, Nolan P1)

Cohort: 153 handles rejected on the broken firstPost ("no post link found")
condition across the 09-21 to 09-24 streak, excluding the 41 already
experimented on 09-24. Replayed through the wired path:
deterministic near-miss list -> bounded CLI follow-up
(ig-nearmiss-followup.js, 5 positive controls, all passed) -> classify
(ig-disposition.decide) -> skip-list decision (ig-apply-reconciliation.py).
History preserved per handle in ig-skip-history.json.

## Counts (Nolan's exact shape)

- replayed: 153
- recovered: 14 (12 RECOVERED_CANDIDATE: verified business/creator accounts with
  fresh posts, routed to engagement; 2 RECOVERED_REVIEW: real accounts with
  posts but personal account_type, needs A2 review)
- legitimate reject: 69 (68 CONFIRMED_EXCLUDE: wrong country 54, private 6,
  stale feed 8; 1 CONFIRMED_EMPTY: account not found via follow-up). All 69
  re-added to the skip list with real evidence.
- unknown: 70 (all STILL_UNKNOWN: profile shows posts but the posts API returned
  no items; fail-closed, never skipped, never permanent rejects; retryable by
  the next pass)

14 + 69 + 70 = 153. Zero overlap with the 41-handle experiment set.

## Combined with the 09-24 experiment (41 handles)

- Total defect-affected classified: 194
- Recovered total: 24 (10 + 14)
- Legitimate reject total: 99 (30 + 69)
- Unknown total: 72 (2 + 70), all pending, none in skip

## Skip list state

- ig-skip-list-20260924-1805.json: 423 entries.
- Verified: 69/69 replay legitimate rejects present with evidence; 0
  STILL_UNKNOWN / RECOVERED / DEFERRED present.
- Two mixed-history handles (@hvac_velocity, @roofer.dad) came back
  STILL_UNKNOWN and were removed from skip: their prior entries rested partly
  on the defective gate plus a weak DOM location heuristic, and UNKNOWN never
  becomes a permanent reject. Full history kept in the ledger.

## Artifacts

- Cohort: ig-replay-cohort-2026-09-24.txt
- Input: ig-replay-input-2026-09-24.json
- Reconciliation: ig-replay-reconciliation-2026-09-24.json
- Skip list: engagement-passes/ig-skip-list-20260924-1805.json
- History ledger: engagement-passes/ig-skip-history.json
- Invalidation ledger: engagement-passes/ig-skip-invalidation-2026-09-24.json
