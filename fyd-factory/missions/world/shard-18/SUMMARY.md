# WORLD SHARD-18 SUMMARY (indices 9000-9499, 500 missions)

Worker: WORLD-SHARD-1 (twelfth shard; claimed via CLAIMS.jsonl). Same
corrected harness, same pristine baseline, same verify asserts. All artifacts
synthetic.

## Outcome distribution

| outcome | count | pct |
|---|---|---|
| GENERATED | 398 | 79.6% |
| GENERATED_WITH_WARNINGS | 48 | 9.6% |
| ACQUISITION_FAILED | 6 | 1.2% |
| EVIDENCE_CONFLICT | 48 | 9.6% |
| all other outcomes | 0 | 0% |

Hostile x outcome: clean 398 GENERATED; stale-source 6 AF (band [9000,9023]);
contradictory-sources 48 EC; broken-media 48 GW.

## Latencies / throughput

p50 2.165 ms, p95 3.190 ms, max 28.724 ms; 27,191 missions/min; peak RSS 141
MB, heap 47 MB. Pig load before run: 3.58/24.

## Verify asserts

446 rendered: 0 unsafe URL schemes, 0 hidden leaks, 0 unbound claims, 4 pages
/ 15-16 sections, viewport meta, 10/10 determinism spot checks, 446/446
unique digests. 54 terminal: typed failures, zero rendered output.

## Generic classes

None (AF/EC by-design). No patches proposed.

## Cumulative (this worker: 12 shard-dirs, 6,000 missions)

4,974 GENERATED (82.9%), 740 GENERATED_WITH_WARNINGS (12.3%), 142
ACQUISITION_FAILED (2.4%), 144 EVIDENCE_CONFLICT (2.4%), 0 crashes, 0 unsafe
escapes, 0 unbound claims, 0 hidden leaks, 120/120 determinism spot checks.
