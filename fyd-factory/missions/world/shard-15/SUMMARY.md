# WORLD SHARD-15 SUMMARY (indices 7500-7999, 500 missions)

Worker: WORLD-SHARD-1 (ninth shard; claimed via CLAIMS.jsonl). Same corrected
harness, same pristine baseline, same verify asserts. All artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 420 | 84.0% |
| GENERATED_WITH_WARNINGS | 80 | 16.0% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 420 GENERATED; no-jsonld 48 GW; conflicting-hours
32 GW (fail-closed).

## Latencies / throughput

p50 2.283 ms, p95 3.444 ms, max 31.799 ms; 23,825 missions/min; peak RSS 143
MB, heap 41 MB. Pig load before run: 2.71/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages /
15-16 sections, viewport meta, 10/10 determinism spot checks, 500/500 unique
digests.

## Generic classes

None. No patches proposed.

## Cumulative (this worker: 9 shard-dirs, 4,500 missions)

3,730 GENERATED (82.9%), 580 GENERATED_WITH_WARNINGS (12.9%), 94
ACQUISITION_FAILED (2.1%), 96 EVIDENCE_CONFLICT (2.1%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 90/90 determinism spot checks.
