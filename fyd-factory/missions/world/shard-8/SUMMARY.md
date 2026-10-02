# WORLD-SHARD-8 SUMMARY

Worker: WORLD-SHARD-0 (continued; depth 2, no children). Shard: world indices 4000-4499 (500 missions).
Repo: /home/nolan/projects/ping, branch fyd-factory, read-only via ~/workspace/bin/wsl-run.sh. Repo never touched, nothing committed.
All artifacts synthetic: every record carries synthetic:true + testing_only:true. Nothing presented as real.

## Outcome distribution (500/500 missions completed)

- GENERATED: 225 (45.0%)
- GENERATED_WITH_WARNINGS: 275 (55.0%)
- EVIDENCE_CONFLICT: 0 (reclassified 2026-09-23 per factory falsification FF-1; see shard-0/SUMMARY.md taxonomy note)
- CRASH: 0, NEEDS_REVIEW: 0, UNSUPPORTED: 0, UNSAFE_SOURCE: 0, ACQUISITION_FAILED: 0, IDENTITY_AMBIGUOUS: 0

Warning-class breakdown: owner-intent correct-fact 75, owner-intent hide-object 75, hostile conflicting-hours 48 (resolved by source-a precedence, warned), hostile many-services 48, hostile unsafe-urls 21, hostile no-jsonld 8.

The 21 unsafe-urls worlds all rendered GENERATED_WITH_WARNINGS with unsafe_url_count=0: the safe-link seam neutralized every javascript: input.

## Verify asserts (all 500)

unsafe URL schemes 0, unbound factual claims 0, hidden-object leaks 0, validator errors 0, viewport meta 500/500, sections >= 1 on 500/500. Determinism spot-checks 10/10 identical.

## Performance

500 worlds in 977 ms harness time (~30,700 missions/min compute); wall ~5 s with ssh + tsx startup. Peak RSS 161 MB.

## Failure taxonomy / generic classes

One candidate generic class appeared on the first pass: `hidden-object-leaked` x2 (worlds 4260, 4400).

- Minimize: isolated repro of world 4260 (12 services, one hidden).
- Root cause: harness check artifact, not a repo defect. The hidden service's title ("Repair 2") was absent from the HTML; the hidden id "w4260-svc-1" matched only as a substring of the public "w4260-svc-10" id, which the renderer legitimately emits (view-transition-name style, /o/ link). The visibility seam worked correctly.
- Fix: leak check now matches ids/titles on token boundaries (negative lookbehind/ahead for [\w-]) instead of raw substring. Falsified by full-shard rerun: hidden-object-leaked 2 -> 0, both worlds reclassified GENERATED_WITH_WARNINGS (owner-intent:hide-object).
- Fix propagated to the shard-0/4/6 harnesses for consistency (their results unchanged; no rerun needed since they had zero such flags).
- Patches to missions/patches/: none (no repo defect). Fixtures: none.

No other generic classes. All non-generated outcomes are by-design hostile simulations with typed outcomes and preserved evidence.

## Coverage notes

Shard-8 exercised hostiles {no-jsonld, conflicting-hours, many-services, unsafe-urls x21}. Remaining unexercised hostile across the factory: rtl-text.

## Outputs

- results.jsonl (500 lines, shard: 8)
- SHARD-LOG.md
- Working files: run.sh, gen-runner.sh, run-progress.log, run-stats.txt
