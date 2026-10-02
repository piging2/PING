# WORLD-SHARD-7 LOG

## 2026-09-23 ~21:25 MDT: shard 7 claimed
Shard 3 done (SUMMARY.md + SHARD-LOG.md written). Per the never-idle rule, checked missions/world/ for existing shard dirs: shard-0,1,2,3,4,5 exist (other workers active); shard-6 and shard-7 absent. Took shard 7 (indices 3500-3999) as instructed.

## Harness changes for shard 7 (forked copy, shard-3 original preserved as historical record)
- `--range lo hi` CLI support; results to results-range-<lo>-<hi>.jsonl on the Pig; shard field = floor(lo/500).
- Owner phone scheme changed to `+1 (970) 555-${5000+i}` so phones stay unique per world across shards (shard-3 scheme would have collided with shard 7). Source phones already embed i (`555-${100+i}`), unique globally.
- Phone uniqueness verified across both shards' results (1,000 distinct source suffixes).

## Run
Smoke (3 worlds) passed. Full run: 500/500, 1,123 ms, 116 MB peak RSS, single ssh invocation. Results fetched to shard-7/results.jsonl.

## Outcome
All green: 423 GENERATED, 77 GENERATED_WITH_WARNINGS (by-design hostile handling), zero failures of any kind, 20/20 determinism spot checks. No generic classes, no patches. SUMMARY.md written.

## Next idle-step
Shard-6 ([3000,3499]) is still unclaimed and is the highest-value remaining WORLD shard: its range covers rtl-text, franchise-lookalike, and stale-source hostiles, which no completed shard has exercised yet (IDENTITY_AMBIGUOUS and UNSAFE_SOURCE outcomes have zero samples factory-wide from these workers). Recommend taking shard 6 next, or handing it to a fresh worker with the shard-7 harness.
