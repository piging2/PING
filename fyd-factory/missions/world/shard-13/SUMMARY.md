# WORLD SHARD-13 SUMMARY (indices 6500-6999, 500 missions)

Worker: WORLD-SHARD-1 (seventh shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 423 | 84.6% |
| GENERATED_WITH_WARNINGS | 55 | 11.0% |
| ACQUISITION_FAILED | 22 | 4.4% |
| all other outcomes | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; unsafe-urls 7 GW; rtl-text 48
GENERATED; franchise-lookalike 48 GW (lookalike pattern flagged, no ambiguity
gate); stale-source 22 AF (partial band [6912,6999], stage 'source', no render).

## Latencies / throughput

p50 2.204 ms, p95 3.149 ms, max 28.397 ms; 25,694 missions/min; peak RSS 141
MB, heap 41 MB. Pig load before run: 2.32/24.

## Verify asserts

478 rendered: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages
/ 15-16 sections, viewport meta, 10/10 determinism spot checks, 478/478
unique digests. 22 AF: typed failures, no partial output.

## Generic classes

None (22 AF are by-design stale-source behavior). No patches proposed.

## Cumulative (this worker: shards 1, 4dup, 5, 10, 11, 12, 13)

3,500 missions: 2,932 GENERATED (83.8%), 452 GENERATED_WITH_WARNINGS (12.9%),
68 ACQUISITION_FAILED (1.9%), 48 EVIDENCE_CONFLICT (1.4%), 0 crashes, 0
unsafe escapes, 0 unbound claims, 0 hidden leaks, 70/70 determinism spot
checks passed.
