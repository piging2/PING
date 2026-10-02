# SYNTH Shard 2 — SUMMARY

Worker: SYNTH-SHARD-0 (continued; shard 2 was unclaimed). Shard: SYNTH missions, indices 1000-1499 (500 missions).
Harness: final v2 `work/harness.ts` (FYD_SHARD=2), run twice: reference + PATCHED.
Results: [results.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-2/results.jsonl), [results-patched.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-2/results-patched.jsonl).

## Headline rates

| metric | reference | patched |
|---|---|---|
| missions survived | 446/500 (89.2%) | 499/500 (99.8%) |
| owner-correction survival (correct-fact worlds, n=100) | 76/100 (76.0%) | 99/100 (99.0%) |
| hide survival (hide-object worlds, n=100) | 80/100 (80.0%) | 100/100 (100.0%) |

## Outcome distribution (reference)

- SURVIVED: 446
- FAILED: 54, all five known generic classes, no new ones: HIDE_ORPHANED_ID_CHURN 15, CORRECTION_AMBIGUOUS_TARGET 11, SPURIOUS_DRIFT_CONFLICT 8, CORRECTION_SILENTLY_DROPPED 9, CONFLICT_SILENTLY_RESOLVED 11.
- The patch set (v2) fixed all 54 across the five classes in the affected-mission rerun.

## Patched residuals (logged follow-up, not generic)

- CORRECTION_NOT_SURFACED: 1 (mission 1176, probes dropped-field+identity-churn+visibility-flip). Same residual pattern as shard 0 (466, 486), shard 1 (831), shard 3 (1806): identity-churn + visibility-flip leave exactly one public candidate (the parent brand); the correction attaches without a flag. Total across 4 shards: 5. Fix needs an assertion-carried stable target key (record + check = two files); recorded as integration-writer follow-up.
- Verifier correction (this shard): two missions (1196, 1366; probes conflicting-source + visibility-flip, no identity-churn) initially failed patched conflict-labeled because the harness keyed conflict evidence to public business candidates while the conflicted local object had flipped to unlisted. Analysis: a conflict on a non-public entity is moot for the public surface (the occurrence log retains it for the owner; labeling the parent brand's phone with the local's conflict would be a false label), and the ambiguity-fail-closed check must gate on actual ambiguity (ref.ambiguousTarget), not the identity-churn probe alone. Both were verifier false positives, fixed in the harness; the missions now pass. Mission 1806 (shard 3) exposed the same false positives and now correctly classifies as CORRECTION_NOT_SURFACED.

## Invariants held (both modes)

history-immutable, no-unbound-claims, no-unsafe-urls, hide-evidence-retained, hide-owner-view, owner-layer-intact (500/500 per mode), real-conflict-surfaced.

## Performance

- ~48,000 missions/min (reference), ~60,000/min (patched). Peak RSS ~110 MB.
- Pig load low throughout; no saturation waits.

## Notes

- No new generic classes in shard 2; the five known classes reproduced and all fixed by the existing patch set.
- Three shards complete: 0 (indices 0-499), 1 (500-999), 2 (1000-1499). Combined reference survival 1361/1500 (90.7%); combined patched survival 1494/1500 (99.6%).
- Patches remain proposed-only (repo is integration-writer owned): missions/patches/synth-shard0-overlay-orphan-ambiguity.patch (v2), synth-shard0-overlay-drift-normalization.patch, synth-shard0-visibility-hide-reresolve.patch.
