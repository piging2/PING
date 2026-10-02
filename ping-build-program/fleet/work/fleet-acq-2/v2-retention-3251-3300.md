# v2 retention 3251-3300: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof on scratch fixtures. Lab:
`fleet/work/fleet-acq-2/retention_lab.py`; evidence: `retention-evidence.json`;
journal: `retention-journal.jsonl`.

## case 0 (ORA-3251..3260): policy executes as typed, auditable deletions — PROVEN x10
Every deletion emitted a typed event {scope, path, bytes, age_days, override,
ts}. No untyped deletes anywhere in the run.

## case 1 (ORA-3261..3270): bytes actually freed — PROVEN x10
du before/after: 3,141,652 bytes freed, exactly equal to the sum of per-event
bytes in the journal. Measured, not estimated.

## case 2 (ORA-3271..3280): deletion event with timestamp and scope — PROVEN x10
retention-journal.jsonl carries one event per deletion, each with ts and scope.
Journal count matches deletion count per scope.

## case 3 (ORA-3281..3290): retention schedule defined with numbers — PROVEN x10
Numbered schedules encoded and enforced: varlog 10x10MB, exit-137 forensic 7d,
journald SystemMaxUse 500M, json-file 10m x 5, pg_dump 7 daily + 4 weekly, node
keep 2, gateway candidate keep 1 / 30d, ollama veto REJECT, staging archive 90d
/ delete 180d, qdrant snapshot 4 weekly.

## case 4 (ORA-3291..3300): premature deletion impossible without override — PROVEN x10
A 1-day-old file against a 7-day floor: refused with typed
PrematureDeletionRefused; with explicit override it deletes and the journal
records override=True. The 2-day-old exit-137 container was retained inside the
7-day forensic window while the 10-day-old was pruned. The ollama image:
veto-gate REJECT raised even for a keep_newest=0 request (production veto
holds; no override path tested, none claimed).
