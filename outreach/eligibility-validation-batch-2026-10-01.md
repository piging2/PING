# Eligibility validation batch (prepared 2026-10-01, NOT dispatched)

Ready for owner review. Four real candidates from the fb176 pool, each
expected ELIGIBLE, each carrying a fresh evidence envelope. Dispatching
this batch is an owner call; nothing here has been sent anywhere.

## The batch

1. Surf To Turf, Grand Junction (GJ Message Board)
   https://facebook.com/groups/1677940889636763/permalink/2300839417346904/
   Cotton Candy Cocktail promo. Expect ELIGIBLE, corridor in.
2. Efird Family Homestead, Montrose
   https://facebook.com/groups/2375845965922391/permalink/3503955436444766/
   Farm stand open during road construction. Expect ELIGIBLE, corridor in.
3. Pumpkin empanada vendor, Ridgway
   https://facebook.com/groups/1178801365519809/permalink/28658098607163381/
   Homegrown empanadas, message to order. Expect ELIGIBLE, corridor in.
4. Aila Thai Kitchen, Delta
   https://facebook.com/groups/1504277980997243/permalink/1815201623238209/
   Hours and soup special. Expect ELIGIBLE, corridor in.

## Mechanical state (verified at prepare time)

- Plan-time gate: `engagement-guard.py curate --candidates fb176-candidates.json`
  -> 4 eligible, 0 dropped. Full post text joined, so the text-signal rules
  (event, fundraiser, business identity, name rules) evaluated.
- Dispatch-time gate: `evidence-check` -> 4 checked, 0 refused.
- Prepared job (with envelopes): `eligibility-validation-job-2026-10-01.json`.
  Envelopes stamped 2026-10-01T11:31 UTC; TTL 6h. If the owner approves
  dispatch after the TTL, run_pass.sh will re-stamp and re-verify anyway.

## What the owner is being asked

ONE DECISION: dispatch these 4 likes through the normal pass machinery
(run_pass.sh, which re-runs filter + curate + evidence-check + intent
refuse at dispatch time), or hold. This is not a freeze question; the
freeze was released 2026-10-01 ~05:21 MDT. It is the acceptance step for
the eligibility authority: one tiny bounded real batch, then the replay
and adversarial results are confirmed against live behavior.

## Notes

- None of the four businesses appear in the blocked, suppressed, or
  already-engaged registries; all four groups are corridor IN.
- The batch deliberately includes one vendor with no formal business name
  (empanadas) and one anonymous-but-local farm stand: the authority
  evaluates on evidence, not on how polished the post looks.
- If the owner wants a comment batch instead, the same four posts support
  comments; comments run the identical eligibility path.
