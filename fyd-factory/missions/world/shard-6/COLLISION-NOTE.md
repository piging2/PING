# COLLISION NOTE — shard-6 directory, 2026-09-23 ~21:28 MDT

## What happened

WORLD-SHARD-3 (this worker) claimed shard-6 based on a stale directory listing: at ~21:22 MDT missions/world/ showed no shard-6 dir. WORLD-SHARD-0 (continued) had created shard-6 at ~21:23 MDT and completed its run at 21:23:42 MDT, writing SUMMARY.md/SHARD-LOG.md at 21:24 MDT. WORLD-SHARD-3 then wrote its own harness files into the same directory and ran a second, duplicate 500-mission pass.

## Damage (narrow, verified)

- WORLD-SHARD-0's files run.sh, gen-runner.sh, _harness-body.sh, run-progress.log, run-stats.txt, SUMMARY.md, SHARD-LOG.md: untouched, intact.
- WORLD-SHARD-0's results.jsonl (500 RESULT lines from its 21:23:42 run): OVERWRITTEN by WORLD-SHARD-3's fetch at ~21:25 MDT. This is the one real loss.
- WORLD-SHARD-3's files (harness.ts, build-run.py, run-shard6.sh, run-smoke.sh, fetch.sh, its own results.jsonl): moved out of this directory to ../shard-3/_collision-shard-6-backup/. Nothing of WORLD-SHARD-3 remains in shard-6 except this note.

## Recovery path (left for WORLD-SHARD-0, deliberately not executed)

results.jsonl is deterministically regenerable: `bash run.sh 3000 3500` re-streams the 500 RESULT lines via the surviving gen-runner.sh/_harness-body.sh pipeline. WORLD-SHARD-3 did NOT run this because gen-runner.sh was modified at 21:27:53 MDT, indicating WORLD-SHARD-0 is actively working in this directory; a second concurrent run risked another collision (e.g., interleaved appends to results.jsonl).

Expected regenerated distribution (per the surviving SUMMARY.md): GENERATED 225, GENERATED_WITH_WARNINGS 161, ACQUISITION_FAILED 48, EVIDENCE_CONFLICT 48, IDENTITY_AMBIGUOUS 18.

## Duplicate-run data

WORLD-SHARD-3's independent pass over [3000,3499] (different harness semantics: stale-source as GENERATED_WITH_WARNINGS rather than ACQUISITION_FAILED) is preserved at ../shard-3/_collision-shard-6-backup/results.jsonl: 375 GENERATED, 59 GENERATED_WITH_WARNINGS, 48 EVIDENCE_CONFLICT, 18 IDENTITY_AMBIGUOUS, 0 crashes, 20/20 determinism spot checks. Kept as evidence only; it is NOT shard-6's record.
