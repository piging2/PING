# SYNTH shard-3 log

## Why this shard exists

Finished shards 0-2; per the never-idle rule took unclaimed shard 3 (indices 1500-1999) with the same final harness (FYD_SHARD=3).

## Decisions at 80%+

- Reference run (464/500), then patched (499/500). All 5 known generic classes reproduced; no new ones.
- Mission 1806 exposed two verifier false positives; fixed the instrument (ambiguity gated on ref.ambiguousTarget computed independent of the correction loop; conflict-labeled skipped when the conflict subject is not public) and reran all four shards. Reference results unchanged everywhere; mission 1806 now correctly classifies as CORRECTION_NOT_SURFACED (5th instance of the logged residual).
- Did not propose a patch for the residual: the fix needs an assertion-carried stable target key (two files), exceeding the one-authorized-path constraint. Logged as follow-up.

## Timeline

- Created dir, copied final harness + falsify.
- Ran both modes; diagnosed 1806; fixed verifier (2 iterations: first attempt gated on a loop-local variable, caught by 5 shard-1 regressions, corrected to source-level computation); reran all shards; wrote SUMMARY.md; this log.

## Next (for whoever continues)

- missions/synth/shard-4 (indices 2000-2499) is unclaimed: same harness, FYD_SHARD=4.
- Follow-up: stable-target-key for CORRECTION_NOT_SURFACED (5 across 4 shards).

## Files

- results.jsonl, results-patched.jsonl (500 lines each).
- work/harness.ts (final), work/falsify.ts (27 probes).
- Patches shared in missions/patches/.
