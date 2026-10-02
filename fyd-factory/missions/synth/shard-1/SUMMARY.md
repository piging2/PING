# SYNTH Shard 1 — SUMMARY

Worker: SYNTH-SHARD-0 (continued; shard 1 was unclaimed). Shard: SYNTH missions, indices 500-999 (500 missions).
Harness: same `work/harness.ts` (FYD_SHARD=1), run twice: reference + PATCHED.
Results: [results.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-1/results.jsonl), [results-patched.jsonl](sandbox://workspace/fyd-factory/missions/synth/shard-1/results-patched.jsonl).
Hostile mix differs from shard 0 (contract: HOSTILES[(i//192)%10]): many-services 19, unsafe-urls 48, rtl-text 48, franchise-lookalike 10.

## Headline rates

| metric | reference | patched |
|---|---|---|
| missions survived | 452/500 (90.4%) | 499/500 (99.8%) |
| owner-correction survival (correct-fact worlds, n=100) | 82/100 (82.0%) | 99/100 (99.0%) |
| hide survival (hide-object worlds, n=100) | 85/100 (85.0%) | 100/100 (100.0%) |

## Outcome distribution (reference)

- SURVIVED: 452
- FAILED: 48: the 4 shard-0 generic classes recur (HIDE_ORPHANED_ID_CHURN 13, CORRECTION_AMBIGUOUS_TARGET 11, SPURIOUS_DRIFT_CONFLICT 12, CORRECTION_SILENTLY_DROPPED 6) plus one NEW generic class:
  - CONFLICT_SILENTLY_RESOLVED: 6 (stage: projection)

## New generic class: GC-5 CONFLICT_SILENTLY_RESOLVED

- DOMAIN: FYD projection composition / COMPONENT: business-object resolution for projection (shared predicate findBusinessObject, src/fyd/object/owner-overlay.ts) / CLAIM: when a refresh introduces a second business object, conflict evidence keyed to the pre-refresh business identity goes silent on the composed surface / EVIDENCE: 6 missions (fixture synth-shard1-conflict-silently-resolved, mission 645; also 735, 964, 976, 984, 992): probes conflicting-source + identity-churn. A secondary source asserts a different phone for the local business object; the churned refresh emits the parent-brand object first; the projection composes candidates[0] and shows its phone with no conflict label. The genuine conflict (evidence-backed, occurrence-bound) is never labeled on the presented fact. / CALLER: projection composition / CALLEE: findBusinessObject (first-match) / WRITER: source refresh / READER: public site consumers / AUTHORITY: owner-overlay.ts / CLASSIFICATION: generic (6 same signature) / CONFIDENCE: high / BROKEN BOUNDARY: conflict evidence is keyed to an object identity the projection no longer presents / DEPENDENCIES: corrections.ts conflict algebra, visibility-policy.ts / AFFECTS AGENTS: projection, Ask FYD public answers.
- Improve-once: fixture written; existing mechanism reused (the shared findBusinessObject predicate); patch v2 of synth-shard0-overlay-orphan-ambiguity.patch (same authorized path, src/fyd/object/owner-overlay.ts): findBusinessObject is now fail-closed (returns the object only when EXACTLY ONE candidate matches; null otherwise), with a businessCandidates() helper so the overlay keeps distinguishing no-business-object from ambiguous-target. All three existing call sites already null-handle (overrides route records sourceValue null; patch-loop preview reports unpreviewable; overlay surfaces orphaned). git apply --check clean against pristine HEAD e48ef710.
- Reran affected missions (PATCHED): GC-5 6 -> 0 (ambiguity-fail-closed check: no settled business contact facts presented under ambiguity). The other four classes: 42 -> 0 combined.
- Falsified: 7 new probes (exactly-one resolves, two -> null, zero -> null, non-public duplicates ignored, route caller degrades honestly) -> all pass; 27/27 total in work/falsify.ts.

## Residual (logged follow-up, not patched)

CORRECTION_NOT_SURFACED: 1 here (mission 831) + shard-0 x2 (466, 486) + shard-2 x1 (1176) + shard-3 x1 (1806) = 5 across four shards. Signature: identity-churn + visibility-flip coincide, leaving exactly one public candidate (the parent-brand object); the correction attaches to it while the local business shows source values, with no flag. Fixing needs a stable target key carried on the assertion record (corrections.ts record change + overlay check = two files), which exceeds the one-authorized-path patch constraint; recorded here as a follow-up for the integration writer with full evidence in results-patched.jsonl. Product tradeoff noted: fail-closed projection presents no settled business contact facts under ambiguity; designing an explicit ambiguity notice for the public surface is a Nolan-level product decision.

## Invariants held (both shards, both modes)

history-immutable, no-unbound-claims, no-unsafe-urls, hide-evidence-retained, hide-owner-view, conflict-labeled (outside ambiguity), owner-layer-intact (500/500 per shard per mode), real-conflict-surfaced.

## Performance

- Throughput: ~87,700 missions/min (reference), ~52,700/min (patched). Peak RSS 109.4 MB.
- Pig load remained low throughout; no saturation waits.

## Notes

- Shard-1 hostile mix exercised franchise-lookalike/rtl-text/unsafe-urls/many-services, which shard 0's index range could not (contract artifact). The four shard-0 classes reproduced at similar rates, confirming they are not index-range accidents.
- Patches remain proposed-only (repo is integration-writer owned): missions/patches/synth-shard0-overlay-orphan-ambiguity.patch (v2), synth-shard0-overlay-drift-normalization.patch, synth-shard0-visibility-hide-reresolve.patch.
