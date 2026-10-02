# SYNTH shard-1 log

## Why this shard exists

Finished shard 0; per the never-idle rule checked missions/synth/ for unclaimed shards: only shard-0 existed. Took shard 1 (indices 500-999) with the same harness (FYD_SHARD=1).

## Decisions at 80%+

- Reused the shard-0 harness unchanged for the reference run: the world contract is index-pure, so shard 1 automatically exercises a different hostile mix (franchise-lookalike, rtl-text, unsafe-urls, many-services vs shard 0's no-jsonld/conflicting-hours/many-services).
- New generic class GC-5 (CONFLICT_SILENTLY_RESOLVED, 6 missions) got the improve-once treatment: fixture -> existing mechanism (shared findBusinessObject predicate) -> patch v2 of the existing overlay patch (same authorized path, no new patch file) -> git apply --check clean -> rerun -> falsify (7 new probes) -> 6/6 fixed.
- Did NOT propose a patch for the CORRECTION_NOT_SURFACED residual (3 missions across both shards): the real fix needs an assertion-carried stable target key (record + check = two files), exceeding the one-authorized-path constraint. Logged as follow-up with evidence instead of a half-measure patch.
- Documented the product tradeoff explicitly: fail-closed projection shows no settled business contact facts under ambiguity. An explicit public ambiguity notice is a product decision for Nolan, not something to improvise.

## Timeline

- Copied final harness (v2) to shard-1/work; ran reference: 452/500 survived.
- Found GC-5 (6 missions, probes conflicting-source + identity-churn).
- Extended patch 1 -> v2 (fail-closed findBusinessObject + businessCandidates helper); re-checked all 3 patches.
- Updated harness PATCHED mode to v2 semantics; reran both shards both modes: shard-0 463/498, shard-1 452/499.
- Falsification: 27/27 pass.
- Wrote SUMMARY.md; this log.

## Next (for whoever continues)

- missions/synth/shard-2 (indices 1000-1499) is unclaimed: same harness, FYD_SHARD=2.
- The 3-mission CORRECTION_NOT_SURFACED residual wants the stable-target-key follow-up (integration writer).
- Cross-class falsification of other shards' classifications is still open per the never-idle rule.

## Files

- results.jsonl, results-patched.jsonl (500 lines each).
- work/harness.ts (final v2), work/falsify.ts (27 probes).
- ../fixtures/synth-shard1-conflict-silently-resolved.json.
- Patches shared with shard 0 in missions/patches/ (patch 1 is v2).
