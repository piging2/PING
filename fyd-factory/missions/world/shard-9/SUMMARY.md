# WORLD-SHARD-9 SUMMARY

Worker: WORLD-SHARD-0 (continued; depth 2, no children). Shard: world indices 4500-4999 (500 missions). Final WORLD shard.
Repo: /home/nolan/projects/ping, branch fyd-factory, read-only via ~/workspace/bin/wsl-run.sh. Repo never touched, nothing committed.
All artifacts synthetic: every record carries synthetic:true + testing_only:true. Nothing presented as real.

## Outcome distribution (500/500 missions completed)

- GENERATED: 225 (45.0%)
- GENERATED_WITH_WARNINGS: 273 (54.6%)
- IDENTITY_AMBIGUOUS: 0 (reclassified 2026-09-23 per factory falsification FF-2; see shard-0/SUMMARY.md taxonomy note)
- ACQUISITION_FAILED: 2 (0.4%)
- CRASH: 0, NEEDS_REVIEW: 0, UNSUPPORTED: 0, UNSAFE_SOURCE: 0, EVIDENCE_CONFLICT: 0

Warning-class breakdown: owner-intent correct-fact 75, owner-intent hide-object 75, hostile rtl-text 48, hostile unsafe-urls 27.

This shard completes hostile coverage for the factory: rtl-text (48 worlds, all GENERATED_WITH_WARNINGS, no rendering anomalies detected), franchise-lookalike (48, GENERATED_WITH_WARNINGS: pattern flagged, identity synthetic-independent by construction), stale-source (2, ACQUISITION_FAILED, typed at source stage).

## Verify asserts (all 500)

unsafe URL schemes 0, unbound factual claims 0, hidden-object leaks 0, validator errors 0, viewport meta 500/500, sections >= 1 on every rendered mission. Determinism spot-checks 10/10 identical.

## Performance

500 worlds in 923 ms harness time (~32,500 missions/min compute); wall ~5 s with ssh + tsx startup. Peak RSS 149 MB.

## Failure taxonomy / generic classes

No repo defects. All non-generated outcomes are by-design hostile simulations with typed outcomes and preserved evidence. No new generic classes. Patches: none. Fixtures: none.

## Factory-wide WORLD coverage (shards 0-9)

All 10 shards claimed and complete: shard-0/4/6/8/9 by WORLD-SHARD-0 (2,500 missions), shard-1/2/3/5/7 by sibling workers. All 10 HOSTILES exercised: clean, no-jsonld, conflicting-hours, many-services, unsafe-urls, rtl-text, franchise-lookalike, stale-source, contradictory-sources, broken-media.

## Outputs

- results.jsonl (500 lines, shard: 9)
- SHARD-LOG.md
- Working files: run.sh, gen-runner.sh, run-progress.log, run-stats.txt
