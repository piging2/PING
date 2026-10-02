# WORLD-SHARD-5 LOG

Taken per the no-idling rule after shard-1 (shard-5 was unclaimed; existing
shards at the time: shard-0, shard-1, shard-2, shard-3).

- 21:19 MDT: Pig load 2.15/24 cores, under ceiling. Launched identical harness
  with START=2500 END=2999, OUT_DIR=/home/nolan/shard5, same boot.cjs shims,
  same /home/nolan/ping-clean baseline. One ssh invocation for the whole
  shard; results appended incrementally.
- 21:20 MDT: 500/500 complete, ~24,700/min. Retrieved results.jsonl +
  stats.json. Zero crashes, zero unsafe escapes, zero unbound claims.
- Wrote SUMMARY.md. Next per the rule: falsify sibling shards' failure
  classifications (shard-0 shows 48 EVIDENCE_CONFLICT; shard-2/3 use a
  different record schema), then discover the next highest-value gap.

## Falsification pass (2026-09-23 ~21:30 MDT)

Falsified sibling shards' failure classifications; full report in
shard-1/FALSIFICATION.md. Results: shard-0's 48 EVIDENCE_CONFLICT falsified
(full renders under a terminal label); shard-2's 38 IDENTITY_AMBIGUOUS
falsified as stated (basis contradicts synthetic provenance); shard-2's 16
ACQUISITION_FAILED and 39 EVIDENCE_CONFLICT confirmed correct; shard-3's 9
EVIDENCE_CONFLICT falsified (rendered + wrong stage + 18 unbound claims).
Self-falsification: my own 13 IDENTITY_AMBIGUOUS reclassified to
GENERATED_WITH_WARNINGS in results.jsonl/stats.json/summaries.

Next: shard-4 ([2000,2500)) is unclaimed. Taking it.
