# WORLD SHARD-12 SUMMARY (indices 6000-6499, 500 missions)

Worker: WORLD-SHARD-1 (sixth shard; claimed via CLAIMS.jsonl). Same corrected
harness, same pristine baseline, same verify asserts. All artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 77 | 15.4% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; conflicting-hours 36 GW (fail-closed);
many-services 48 GENERATED (24-service stress); unsafe-urls 41 GW (sanitizer
engaged, 0 unsafe schemes in output).

## Latencies / throughput

p50 2.408 ms, p95 5.806 ms, max 33.852 ms; 20,402 missions/min; peak RSS 144
MB, heap 55 MB. Pig load before run: 2.30/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages /
15-16 sections, viewport meta, 10/10 determinism spot checks, 500/500 unique
digests.

## Generic classes

None. No patches proposed.

## Cumulative (this worker: shards 1, 4dup, 5, 10, 11, 12)

3,000 missions: 2,509 GENERATED (83.6%), 397 GENERATED_WITH_WARNINGS (13.2%),
46 ACQUISITION_FAILED (1.5%), 48 EVIDENCE_CONFLICT (1.6%), 0 crashes, 0
unsafe escapes, 0 unbound claims, 0 hidden leaks, 60/60 determinism spot
checks passed.
