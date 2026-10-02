# WORLD SHARD-19 SUMMARY (indices 9500-9999, 500 missions)

Worker: WORLD-SHARD-1 (thirteenth shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 404 | 80.8% |
| GENERATED_WITH_WARNINGS | 96 | 19.2% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 400 GENERATED; no-jsonld 48 GW; conflicting-hours
48 GW; many-services 4 GENERATED (partial band at range end).

## Latencies / throughput

p50 2.243 ms, p95 3.240 ms, max 30.322 ms; 24,531 missions/min; peak RSS 144
MB, heap 49 MB. Pig load before run: 3.73/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages /
15-16 sections, viewport meta, 10/10 determinism spot checks, 500/500 unique
digests.

## Generic classes

None. No patches proposed.

## Cumulative (this worker: 13 shard-dirs, 6,500 missions)

5,378 GENERATED (82.7%), 836 GENERATED_WITH_WARNINGS (12.9%), 142
ACQUISITION_FAILED (2.2%), 144 EVIDENCE_CONFLICT (2.2%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 130/130 determinism spot checks.
