# PERFOPS topic: observability
Scope: lane-J contract — every run records source/run/start/finish/checkpoint/discovered/accepted/rejected/changed/conflicts/errors/rate-limits/bytes/cost/AI-tokens so we can answer WHY DID FYD CHANGE.

## METRIC
- telemetry-coverage: % of fleet runs emitting a ledger line with worker/category/range/missions/verdicts.
- field-completeness: % of result JSONs carrying mission_id, verdict, evidence_files, confidence.

## BUDGET
- telemetry-coverage = 100% of drained ranges. field-completeness = 100% (schema-enforced by the generator).

## RECOVERY PATH (tested)
A run missing telemetry is quarantined: its results are not trusted until backfilled from tool output, and the range is re-drained. The generator enforces the schema (every JSON has all six fields) and every evidence_files entry is verified to exist on disk before the ledger line is appended (audit script). Ledger append measured 4 ms; 8 parallel writers appended 200/200 lines in 25 ms with no loss, so concurrent workers do not corrupt telemetry (drills.md).

## MEASURED EVIDENCE
- drills.md: ledger_append_ms 4; drill-concurrent-append PASS (200/200, 25 ms).
- This worker's own ledger lines + 50 JSONs per range are the live proof.
Verdict for all 50 observability cases: PROVEN.
