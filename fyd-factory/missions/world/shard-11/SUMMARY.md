# WORLD SHARD-11 SUMMARY (indices 5500-5999, 500 missions)

Worker: WORLD-SHARD-1 (fifth shard; claimed via CLAIMS.jsonl before running).
Same corrected harness, same pristine baseline, same verify asserts. All
artifacts synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 77 | 15.4% |
| all terminal outcomes | 0 | 0% |

Hostile x outcome: clean 423 GENERATED; broken-media 17 GW; no-jsonld 48 GW;
conflicting-hours 12 GW (fail-closed, contested field omitted).

## Latencies / throughput

p50 2.159 ms, p95 3.014 ms, max 27.088 ms; 25,683 missions/min; peak RSS 144
MB, heap 52 MB. Pig load before run: 2.36/24.

## Verify asserts

500/500: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages /
15-16 sections, viewport meta, 10/10 determinism spot checks, 500/500 unique
digests.

## Generic classes

None. No patches proposed.

## Cumulative (this worker: shards 1, 4dup, 5, 10, 11)

2,500 missions: 2,086 GENERATED (83.4%), 320 GENERATED_WITH_WARNINGS (12.8%),
46 ACQUISITION_FAILED (1.8%), 48 EVIDENCE_CONFLICT (1.9%), 0 crashes, 0
unsafe escapes, 0 unbound claims, 0 hidden leaks, 50/50 determinism spot
checks passed.
