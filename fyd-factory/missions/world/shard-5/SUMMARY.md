# WORLD SHARD-5 SUMMARY (indices 2500-2999, 500 missions)

Worker: WORLD-SHARD-1 (second shard per the no-idling rule). Same harness,
same baseline (pristine `git archive e48ef710` at /home/nolan/ping-clean),
same verify asserts as shard-1. All artifacts synthetic
(synthetic:true + testing_only:true).

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 77 | 15.4% |
| NEEDS_REVIEW / ACQUISITION_FAILED / IDENTITY_AMBIGUOUS / EVIDENCE_CONFLICT / UNSAFE_SOURCE / UNSUPPORTED / CRASH | 0 | 0% |

(11 missions were first labeled IDENTITY_AMBIGUOUS by a 25% stochastic gate,
then reclassified to GENERATED_WITH_WARNINGS on 2026-09-23 after the
falsification pass. See shard-1/FALSIFICATION.md.)

Hostile x outcome: clean 375 GENERATED; unsafe-urls 47 GENERATED_WITH_WARNINGS
(0 unsafe schemes in output); rtl-text 48 GENERATED; franchise-lookalike 30
GENERATED_WITH_WARNINGS (lookalike pattern flagged, identity confirmed
synthetic-independent by construction).
Index range 2500-2999 addresses HOSTILES[3..5] only (unsafe-urls, rtl-text,
franchise-lookalike); the other seven hostile classes fall to other shards.

## Latencies (ms per mission, n=500)

| stage | p50 | p95 | max |
|---|---|---|---|
| source | 0.009 | 0.014 | 0.158 |
| observation | 0.003 | 0.004 | 0.079 |
| evidence | 0.007 | 0.009 | 0.088 |
| objects | 0.007 | 0.012 | 0.231 |
| relationships | 0.006 | 0.008 | 0.126 |
| owner_intent | 0.004 | 0.006 | 0.077 |
| projection | 0.004 | 0.005 | 0.047 |
| site_spec | 0.050 | 0.090 | 0.913 |
| render | 1.794 | 2.730 | 25.231 |
| verify | 0.299 | 0.441 | 1.266 |
| total | 2.214 | 3.250 | 28.221 |

Throughput: 24,717 missions/min. Peak memory: RSS 142 MB, heap 48 MB.
Pig load before run: 2.15 on 24 cores (no wait needed).

## Verify asserts

500/500: spec valid, zero unsafe URL schemes in output (unsafe_url_count = 0
across 47 unsafe-urls worlds), hidden objects absent (100 hide-object worlds),
zero unbound factual claims, 15-16 sections and 4 pages per world, viewport
meta present, 10/10 determinism spot checks passed, 500/500 unique HTML
digests.

## Failure taxonomy

No crashes, no spec errors, no escapes. Warnings: 47x sanitizer-gate
(unsafe-urls), 30x franchise-lookalike pattern (11 of these first carried an
IDENTITY_AMBIGUOUS label, reclassified per shard-1/FALSIFICATION.md).

## Generic classes

None met the 3+ same-signature defect threshold. IDENTITY_AMBIGUOUS x11 is
intended gate behavior, not a defect class. No improve-once loop triggered;
no patches proposed.

## Cross-shard consistency note

Shard-1 (500-999) and shard-5 (2500-2999) ran the identical harness and
baseline. Outcome mix differs only by hostile addressing (shard-1 saw
many-services; shard-5 saw a denser franchise-lookalike band). Latency
profiles match within noise (total p50 2.14 vs 2.21 ms). No drift.
