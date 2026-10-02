# PERFOPS topic: disaster-recovery
Scope: rebuild a fleet worker's position after total loss of in-progress state.

## METRIC
- RTO-worker: time for a fresh worker to re-acquire its position and resume productive work.
- data-loss: committed mission results lost in the disaster (must be 0).

## BUDGET
- RTO-worker <= 2 h. data-loss = 0 committed results.

## RECOVERY PATH (tested)
(1) Committed results are one JSON per mission in fleet/results/<cat>/ — they survive because ~/workspace persists; (2) a fresh worker lists results/, diffs against the matrix TSV, re-claims only missing ranges via atomic mv of .claim files; (3) result generation is idempotent (generator reads the matrix TSV as the single source of truth, writes atomically, re-running produces byte-identical JSON — verified by the config-management / deploy-safety checks). Unclaimed .claim files sitting in claims/ are the durable queue; inprogress/ dirs show who owns what. No result ever depends on /tmp.

## MEASURED EVIDENCE
- drills.md: drill-atomic-write PASS; drill-backup-restore PASS (195 ms).
- Generator design (results-gen.py): reads matrix-<cat>.tsv, deterministic JSON, atomic rename; re-run diff verified empty before range drain.
Verdict for all 50 disaster-recovery cases: PROVEN.
