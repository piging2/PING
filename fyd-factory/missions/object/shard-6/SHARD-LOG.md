# OBJECT-SHARD-6 LOG

## Decisions at 80%+
- Same bundle and clean baseline as shard-5 (no rebuild needed; harness takes start/end args).
- Mission 3192 "Walkways leak": investigated before classifying. Decision: harness false positive, not a repo defect. Evidence: the privatized object (fixture-b-alder-creek-service-21, title "Walkways") vs public object fixture-b-alder-creek-service-20 whose description contains "walkways" legitimately. Did not propose a repo patch; recorded the verifier lesson (word-boundary matching) for the next harness revision.

## What happened
1. Ran shard-6 (3000-3499) on the Pig immediately after shard-5: DONE 500, 6,156/min, peak 247 MB.
2. Analyzed: 454 WARNINGS / 46 NEEDS_REVIEW (45 phonec-class + 1 hidden-leak flag). Investigated the flag -> false positive (see SUMMARY).
3. Pulled results.jsonl locally (500 lines, all valid, baseline field verified).
4. Re-listed before writing (per parent instruction): no interference. Wrote SUMMARY.md.

## After finishing
- Proceeded to DECISION shards 2-3 (500 new definitions + adjudication), then adversarial runs. No idle time per the standing invariant.
