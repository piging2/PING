# WORLD SHARD-16 SUMMARY (indices 8000-8499, 500 missions)

Worker: WORLD-SHARD-1 (tenth shard; claimed via CLAIMS.jsonl). Same corrected
harness, same pristine baseline, same verify asserts. All artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 436 | 87.2% |
| GENERATED_WITH_WARNINGS | 64 | 12.8% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; conflicting-hours 16 GW; many-services
48 GENERATED; unsafe-urls 48 GW (0 unsafe schemes in output); rtl-text 13
GENERATED.

## Latencies / throughput

p50 2.143 ms, p95 5.411 ms, max 25.759 ms; 23,199 missions/min; peak RSS 145
MB, heap 42 MB. Pig load before run: 3.59/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages /
15-16 sections, viewport meta, 10/10 determinism spot checks, 500/500 unique
digests.

## Generic classes

None. No patches proposed.

## Cumulative (this worker: 10 shard-dirs, 5,000 missions)

4,166 GENERATED (83.3%), 644 GENERATED_WITH_WARNINGS (12.9%), 94
ACQUISITION_FAILED (1.9%), 96 EVIDENCE_CONFLICT (1.9%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 100/100 determinism spot checks.
