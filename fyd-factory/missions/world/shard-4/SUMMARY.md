# WORLD-SHARD-4 SUMMARY

Worker: WORLD-SHARD-0 (continued; depth 2, no children). Shard: world indices 2000-2499 (500 missions).
Repo: /home/nolan/projects/ping, branch fyd-factory, read-only via ~/workspace/bin/wsl-run.sh. Repo never touched, nothing committed.
All artifacts synthetic: every record carries synthetic:true + testing_only:true. Nothing presented as real.

## Outcome distribution (500/500 missions completed)

- GENERATED: 225 (45.0%)
- GENERATED_WITH_WARNINGS: 275 (55.0%)
- EVIDENCE_CONFLICT: 0 (reclassified 2026-09-23 per factory falsification FF-1; see shard-0/SUMMARY.md taxonomy note)
- CRASH: 0, NEEDS_REVIEW: 0, UNSUPPORTED: 0, UNSAFE_SOURCE: 0, ACQUISITION_FAILED: 0, IDENTITY_AMBIGUOUS: 0

Warning-class breakdown: owner-intent correct-fact 75, owner-intent hide-object 75, hostile conflicting-hours 48 (resolved by source-a precedence, warned), hostile many-services 48, hostile no-jsonld 28, hostile unsafe-urls 1.

## The unsafe-urls world (i=2496)

First live exercise of the unsafe-urls hostile in the factory: website field "javascript:alert('xss')". Outcome: GENERATED_WITH_WARNINGS, unsafe_url_count=0 in output. The repo's resolveSafeLink seam neutralized it (matches the targeted probe from shard-0). Classifier armed correctly: had any unsafe scheme reached the HTML it would have been UNSAFE_SOURCE.

## Verify asserts (all 500)

unsafe URL schemes 0, unbound factual claims 0, hidden-object leaks 0, validator errors 0, viewport meta 500/500, sections >= 1 on 500/500. Determinism spot-checks 10/10 identical.

## Performance

500 worlds in 975 ms harness time (~30,800 missions/min compute); wall ~5 s with ssh + tsx startup. Peak RSS 147 MB. Mission p50 ~1.7 ms (same profile as shard-0; per-stage stats in shard-0 SUMMARY.md).

## Failure taxonomy / generic classes

No repo defects. The 48 conflicting-hours worlds rendered fully with the conflict resolved by documented precedence (GENERATED_WITH_WARNINGS after 2026-09-23 reclassification). No new generic classes beyond those already dispositioned in shard-0. Patches proposed: none. Fixtures added: none.

## Coverage notes

Shard-4 address space exercises hostiles {no-jsonld, conflicting-hours, many-services, unsafe-urls x1}. Remaining unexercised hostiles (rtl-text, franchise-lookalike, stale-source, contradictory-sources, broken-media) fall in higher shards.

## Outputs

- results.jsonl (500 lines, same schema as shard-0, shard: 4)
- SHARD-LOG.md
- Working files: run.sh, gen-runner.sh (parameterized START/END/SHARD), run-progress.log, run-stats.txt
