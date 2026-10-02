# OBJECT-SHARD-4 SUMMARY (missions 2000-2499)

## Outcome distribution (unpatched renderer, canonical)

- GENERATED_WITH_WARNINGS: 459
- NEEDS_REVIEW: 41 (all at verify; zero crashes)
- Determinism check (spec twice + full render twice, digest compare): PASS on
  all 500. Unsafe URL schemes in rendered HTML: 0.
- Throughput ~6,116 missions/min; peak RSS 234 MB.

## Method

Same harness as the WORLD-SHARD-2 duplicate OBJECT run documented in
object/shard-2 (harness-object.tsx, copied here): corpus fixture rotation
(sorted JSON paths), deterministic mutations (drop/privatize/tweak/
owner-correct, seed = mission index), generateSiteSpec -> validateSiteSpec ->
buildRenderContext -> render HTML -> determinism check -> verify (6 WORLD
asserts + phone-conflict fail-closed check). Read-only vs the repo.

Note: this methodology differs from OBJECT-SHARD-1's lane convention
(shards 0-3, group rotation + unsafe/private/unbound marker injection).
Both find real, disjoint classes; see object/shard-2/COLLISION-NOTE for the
shard-2 overlap.

## Findings (replication of the shard-2 duplicate run)

1. **Phone-conflict dial-action fail-closed violation** (41 missions):
   hostile-phonec-{food,personal,retail,trade} (8 each) and
   f2b-canyon-view-dental (9). Contact section renders a tel: dial action for
   one side of an explicitly conflict-marked phone pair. Same class as
   object/shard-2 duplicate; proposed patch:
   missions/patches/0002-object2-phonec-dial-gating.patch (git apply --check
   PASS, 4/4 patch tests pass, patched rerun fixed exactly the affected
   missions with zero regressions).
2. **Claim-badge gap corroboration** (1,212 unbound sections): Links, CTA,
   and ObjectRail sections bind public objects but render no ClaimBadge.
   Independent confirmation of the WORLD shard-2 generic class on fixture
   graphs. Proposed patch:
   missions/patches/0001-shard2-claim-badge-coverage.patch.

## Artifacts

- results.jsonl (canonical, unpatched)
- SHARD-LOG.md
- harness-object.tsx, build-object.mjs (copies of the shard-2 originals)
