# OBJECT-SHARD-5 SUMMARY (missions 2500-2999)

## Claim
- Claimed atomically via missions/claim.sh at 2026-09-24 ~05:16 MDT by wave2-gen-9b2f35ec (lease 6h, fresh). Re-listed immediately before writing: no foreign shards, no collision. Earlier manual CLAIM.md marker superseded by the atomic .claim/ marker.

## Outcome distribution (clean-tree baseline, canonical)
- GENERATED_WITH_WARNINGS: 459
- NEEDS_REVIEW: 41 (all at verify; zero crashes)
- Determinism check (spec twice + full render twice, digest compare): PASS 500/500.
- Unsafe URL schemes in rendered HTML: 0. Hidden-object leaks: 0 (verified, see note below).

## Method
Same harness contract as OBJECT shards 0-4 (fixture graph -> generateSiteSpec -> validateSiteSpec -> buildRenderContext -> renderToStaticMarkup -> determinism check -> 6 WORLD verify asserts + phone-conflict fail-closed check). Corpus: 62 fixtures from /home/nolan/fyd-factory-shard2/corpus/fixtures, sorted rotation, deterministic mutations (drop/privatize/tweak/owner-correct, seed = mission index).

BASELINE CHOICE (documented per task): the patch-integration worker is concurrently applying rail/SEC-FIX patches to the main working tree (/home/nolan/projects/ping, 108 dirty files), so this shard ran against a CLEAN baseline: scratch worktree /home/nolan/fyd-wave2-clean at the frozen SHA e48ef710 (HEAD verified, dirty count 0 apart from the node_modules symlink), esbuild bundle compiled from the clean tree, node_modules symlinked. Every record carries baseline="clean-tree-e48ef710" (500/500). Read-only vs the repo; no repo writes.

## Latencies (per mission, ms)
- load_mutate p50 0.05 / p95 0.28
- sitespec p50 0.05 / p95 0.15
- projection p50 0.01 / p95 0.06
- render p50 1.16 / p95 38.40
- determinism p50 1.22 / p95 39.89
- verify p50 0.12 / p95 2.51
- total p50 2.59 / p95 81.26
- Throughput ~5,755 missions/min; peak RSS 243 MB. Pig load 2.50/24 at start (no saturation wait needed).

## Findings
1. **Phone-conflict dial-action fail-closed violation** (41 missions): hostile-phonec-{food,personal,retail,trade} and f2b-canyon-view-dental. Contact section renders a tel: dial action for one side of an explicitly conflict-marked phone pair. Same known class as OBJECT shards 2-4; proposed patch missions/patches/0002-object2-phonec-dial-gating.patch (morning decision). Counts match shard-4 exactly (41), corroborating the class is stable across mission ranges.
2. **Claim-badge gap corroboration** (1,203 unbound sections): Links, CTA, and ObjectRail sections bind public objects but render no claim badge. Independent confirmation of the WORLD shard-2 generic class on fixture graphs (shard-4 saw 1,212; this shard 1,203). Proposed patch: missions/patches/0001-shard2-claim-badge-coverage.patch.
3. **No new generic classes.** No crashes, no unsafe URLs, no private leaks, no determinism mismatches. The improve-once loop did not fire (one-off checks below stayed one-offs).

## Artifacts
- results.jsonl (canonical, clean baseline; 500 lines, mission indices 2500-2999 verified sequential)
- SHARD-LOG.md, CLAIM.md
- Harness: /home/nolan/fyd-wave2/harness-object.tsx + build-object.mjs (Pig), local copies in missions/wave2/
