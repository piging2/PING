# OBJECT-SHARD-6 SUMMARY (missions 3000-3499)

## Claim
- Claimed atomically via missions/claim.sh at 2026-09-24 ~05:16 MDT by wave2-gen-9b2f35ec (lease 6h, fresh). Re-listed immediately before writing: no foreign shards, no collision.

## Outcome distribution (clean-tree baseline, canonical)
- GENERATED_WITH_WARNINGS: 454
- NEEDS_REVIEW: 46 (all at verify; zero crashes)
- Determinism check (spec twice + full render twice, digest compare): PASS 500/500.
- Unsafe URL schemes in rendered HTML: 0. Hidden-object leaks: 0 real (1 harness false positive, adjudicated below).

## Method
Identical to OBJECT shard-5 (same bundle, same clean-tree baseline at e48ef710, same corpus/mutations). Every record carries baseline="clean-tree-e48ef710" (500/500).

## Latencies (per mission, ms)
- load_mutate p50 0.05 / p95 0.28
- sitespec p50 0.04 / p95 0.12
- projection p50 0.01 / p95 0.05
- render p50 0.92 / p95 37.18
- determinism p50 0.99 / p95 39.84
- verify p50 0.11 / p95 2.65
- total p50 2.17 / p95 81.61
- Throughput ~6,156 missions/min; peak RSS 247 MB.

## Findings
1. **Phone-conflict dial-action fail-closed violation** (45 missions): same known class as shards 2-5 (patch 0002-object2-phonec-dial-gating.patch pending morning decision).
2. **Claim-badge gap corroboration** (1,195 unbound sections): same known class (patch 0001-shard2-claim-badge-coverage.patch).
3. **HARNESS FALSE POSITIVE, adjudicated (mission 3192)**: the verifier flagged hidden object "Walkways" (service-21, privatized by the seeded hide mutation on batch-b-landscaper.json) as leaked into public HTML. Investigation: a DIFFERENT public object (service-20, "Paver patios") carries the description "Patios, walkways, and fire pit pads." The harness's naive substring check (html.includes(title)) fired on the public object's legitimate text. Same class as the WORLD-SHARD-1 "Solar Pro"/"Iron Solar Pros" false positive, which was fixed harness-side with a word-boundary check. This is a verifier artifact, NOT a repo leak: no private object data crosses the public boundary. The record stands as NEEDS_REVIEW with this adjudication; no repo patch warranted. Lesson recorded for the next harness revision: use word-boundary matching for hidden-leak checks.
4. **No new generic classes.** No crashes, no unsafe URLs, no determinism mismatches. Improve-once loop did not fire beyond the adjudicated false positive.

## Artifacts
- results.jsonl (canonical, clean baseline; 500 lines, mission indices 3000-3499 verified sequential)
- SHARD-LOG.md, CLAIM.md
