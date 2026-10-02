# WORLD SHARD-17 SUMMARY (indices 8500-8999, 500 missions)

Worker: WORLD-SHARD-1 (eleventh shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 410 | 82.0% |
| GENERATED_WITH_WARNINGS | 48 | 9.6% |
| ACQUISITION_FAILED | 42 | 8.4% |
| all other outcomes | 0 | 0% |

Hostile x outcome: clean 375 GENERATED; rtl-text 35 GENERATED;
franchise-lookalike 48 GW; stale-source 42 AF (band [8832,8999], stage
'source', no render).

## Latencies / throughput

p50 2.127 ms, p95 3.155 ms, max 26.255 ms; 27,265 missions/min; peak RSS 141
MB, heap 43 MB. Pig load before run: 2.69/24.

## Verify asserts

458 rendered: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages
/ 15-16 sections, viewport meta, 10/10 determinism spot checks, 458/458
unique digests. 42 AF: typed failures, zero rendered output.

## Generic classes

None (42 AF by-design). No patches proposed.

## Cumulative (this worker: 11 shard-dirs, 5,500 missions)

4,576 GENERATED (83.2%), 692 GENERATED_WITH_WARNINGS (12.6%), 136
ACQUISITION_FAILED (2.5%), 96 EVIDENCE_CONFLICT (1.7%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 110/110 determinism spot checks.
