# WORLD-SHARD-6 SUMMARY

Worker: WORLD-SHARD-0 (continued; depth 2, no children). Shard: world indices 3000-3499 (500 missions).
Repo: /home/nolan/projects/ping, branch fyd-factory, read-only via ~/workspace/bin/wsl-run.sh. Repo never touched, nothing committed.
All artifacts synthetic: every record carries synthetic:true + testing_only:true. Nothing presented as real.

## Outcome distribution (500/500 missions completed)

- GENERATED: 225 (45.0%)
- GENERATED_WITH_WARNINGS: 179 (35.8%)
- ACQUISITION_FAILED: 48 (9.6%)
- EVIDENCE_CONFLICT: 48 (9.6%, no site rendered: phone conflict halted at evidence)
- IDENTITY_AMBIGUOUS: 0 (reclassified 2026-09-23 per factory falsification FF-2; see shard-0/SUMMARY.md taxonomy note) (3.6%)
- CRASH: 0, NEEDS_REVIEW: 0, UNSUPPORTED: 0, UNSAFE_SOURCE: 0

Typed-failure paths exercised for the first time in the factory:

- ACQUISITION_FAILED (48): hostile=stale-source. Simulated source outage throws a typed acquisition error at the source stage; no render attempted; the mission record carries the typed outcome and stage. Pipeline never threw an untyped exception.
- IDENTITY_AMBIGUOUS (18): hostile=franchise-lookalike ("Mc<Name>" chain-pattern names). Site still rendered; flagged for human identity review rather than treated as a clean independent.
- EVIDENCE_CONFLICT (48): hostile=contradictory-sources. Two source records disagreed on the phone (identity-critical, no safe fail-closed); both preserved in evidence with conflict flags; pipeline halted at the evidence stage with no site rendered (page_count=0), adopting shard-2's FF-4-confirmed exemplar. (Previously these rendered with source-a precedence; changed 2026-09-23.)
- GENERATED_WITH_WARNINGS includes hostile=franchise-lookalike (18): name pattern flagged; identity synthetic-independent by construction (reclassified from IDENTITY_AMBIGUOUS per FF-2).
- GENERATED_WITH_WARNINGS includes hostile=broken-media (11): media observation marked failed; site rendered without the media.

## Verify asserts (all rendered missions)

unsafe URL schemes 0, unbound factual claims 0, hidden-object leaks 0, validator errors 0, viewport meta present on every rendered mission. Determinism spot-checks 8/8 identical (2 of the 10 check slots fell on ACQUISITION_FAILED worlds, which produce no spec by design).

## Performance

500 worlds in 990 ms harness time (~30,300 missions/min compute); wall ~5 s with ssh + tsx startup. Peak RSS 148 MB.

## Failure taxonomy / generic classes

No repo defects. All non-generated outcomes are by-design hostile simulations with typed outcomes and preserved evidence. No new generic classes. Patches proposed: none. Fixtures added: none.

## Coverage notes

Shard-6 exercised hostiles {franchise-lookalike, stale-source, contradictory-sources, broken-media}. Remaining unexercised hostile: rtl-text (falls in shard-7/8 address space).

## Outputs

- results.jsonl (500 lines, shard: 6)
- SHARD-LOG.md
- Working files: run.sh, gen-runner.sh, run-progress.log, run-stats.txt
