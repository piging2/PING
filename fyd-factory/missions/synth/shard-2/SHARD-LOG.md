# SYNTH shard-2 log

## Why this shard exists

Finished shards 0 and 1; per the never-idle rule took unclaimed shard 2 (indices 1000-1499) with the same final harness (FYD_SHARD=2).

## Decisions at 80%+

- Reference run first (446/500), then patched (497/500). All 5 known generic classes reproduced; no new ones.
- The 11 GC-5 missions all fixed by patch v2 (ambiguity-fail-closed); the 2 patched CONFLICT_SILENTLY_RESOLVED residuals are a different sub-pattern (conflicting-source + visibility-flip, no identity-churn) and below the generic threshold: logged as follow-up with evidence, not patched.
- Did not chase the visibility-flip sub-pattern with a patch: it is likely part-harness-artifact (evidence keyed to public candidates is my modeling choice; the real occurrence log is not visibility-filtered), and the right behavior is a reobservation-design question.

## Timeline

- Created dir, copied final harness + falsify (27 probes).
- Ran both modes; analyzed signatures; wrote SUMMARY.md; this log.

## Next (for whoever continues)

- missions/synth/shard-3 (indices 1500-1999) is unclaimed: same harness, FYD_SHARD=3.
- Follow-ups: stable-target-key for CORRECTION_NOT_SURFACED (4 across 3 shards); visibility-flip conflict-evidence design question (2 missions).

## Files

- results.jsonl, results-patched.jsonl (500 lines each).
- work/harness.ts (v2), work/falsify.ts (27 probes).
- Patches shared in missions/patches/.
