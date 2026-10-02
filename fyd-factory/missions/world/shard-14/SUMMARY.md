# WORLD SHARD-14 SUMMARY (indices 7000-7499, 500 missions)

Worker: WORLD-SHARD-1 (eighth shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 378 | 75.6% |
| GENERATED_WITH_WARNINGS | 48 | 9.6% |
| ACQUISITION_FAILED | 26 | 5.2% |
| EVIDENCE_CONFLICT | 48 | 9.6% |
| all other outcomes | 0 | 0% |

Hostile x outcome: clean 378 GENERATED; stale-source 26 AF (partial band
[7000,7103]); contradictory-sources 48 EC (stage 'evidence', no render);
broken-media 48 GW (media omitted, warning recorded).

## Latencies / throughput

p50 2.192 ms, p95 3.115 ms, max 29.716 ms; 28,290 missions/min; peak RSS 141
MB, heap 48 MB. Pig load before run: 2.89/24.

## Verify asserts

426 rendered: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages
/ 15-16 sections, viewport meta, 10/10 determinism spot checks, 426/426
unique digests. 74 terminal: typed failures, zero rendered output.

## Generic classes

None (AF/EC are by-design hostile behaviors). No patches proposed.

## Cumulative (this worker: 8 shard-dirs, 4,000 missions)

3,310 GENERATED (82.8%), 500 GENERATED_WITH_WARNINGS (12.5%), 94
ACQUISITION_FAILED (2.4%), 96 EVIDENCE_CONFLICT (2.4%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 80/80 determinism spot checks.
