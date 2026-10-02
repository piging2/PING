# SYNTH Shard 3 — SUMMARY

Worker: SYNTH-SHARD-0 (continued; shard 3 was unclaimed). Shard: SYNTH missions, indices 1500-1999 (500 missions).
Harness: final harness (FYD_SHARD=3), run twice: reference + PATCHED.
Results: [results.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-3/results.jsonl), [results-patched.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-3/results-patched.jsonl).

## Headline rates

| metric | reference | patched |
|---|---|---|
| missions survived | 464/500 (92.8%) | 499/500 (99.8%) |
| owner-correction survival (correct-fact worlds, n=100) | 81/100 (81.0%) | 99/100 (99.0%) |
| hide survival (hide-object worlds, n=100) | 86/100 (86.0%) | 100/100 (100.0%) |

## Outcome distribution (reference)

- SURVIVED: 464
- FAILED: 36, all five known generic classes, no new ones: CORRECTION_AMBIGUOUS_TARGET 11, HIDE_ORPHANED_ID_CHURN 14, CONFLICT_SILENTLY_RESOLVED 1, SPURIOUS_DRIFT_CONFLICT 3, CORRECTION_SILENTLY_DROPPED 7.
- The patch set fixed 35 of 36 in the affected-mission rerun.

## Patched residual (logged follow-up, not generic)

- CORRECTION_NOT_SURFACED: 1 (mission 1806, probes conflicting-source+unsafe-url+identity-churn+visibility-flip). Same residual pattern as shard 0 (466, 486), shard 1 (831), shard 2 (1176): identity-churn + visibility-flip leave exactly one public candidate (the parent brand); the correction attaches to it with no flag. Total across 4 shards: 5. Fix needs an assertion-carried stable target key (record + check = two files); recorded as integration-writer follow-up.
- Mission 1806 also exposed two verifier false positives, fixed in the harness: (1) ambiguity-fail-closed fired on the identity-churn probe even when visibility-flip had collapsed the churn to a single public candidate (no actual ambiguity); now gated on ref.ambiguousTarget, which is computed from the refreshed source independent of the correction loop (the loop-only computation missed hide-object/none worlds). (2) conflict-labeled demanded a conflict label when the conflicted local object was unlisted and not presented; now skipped when the conflict subject is not public. Both fixes rerun across all four shards; reference results unchanged.

## Invariants held (both modes)

history-immutable, no-unbound-claims, no-unsafe-urls, hide-evidence-retained, hide-owner-view, owner-layer-intact (500/500 per mode), real-conflict-surfaced.

## Performance

- ~55,000 missions/min. Peak RSS ~110 MB. Pig load low throughout.

## Notes

- No new generic classes in shard 3.
- Four shards complete (indices 0-1999): combined reference survival 1825/2000 (91.3%); combined patched survival 1995/2000 (99.8%).
- Patches remain proposed-only (repo is integration-writer owned): missions/patches/synth-shard0-overlay-orphan-ambiguity.patch (v2), synth-shard0-overlay-drift-normalization.patch, synth-shard0-visibility-hide-reresolve.patch.
