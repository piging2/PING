# v2 retention 3301-3350: cases 5-9 (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof on scratch fixtures. Lab:
`fleet/work/fleet-acq-2/retention_lab2.py`; evidence: `retention2-evidence.json`;
journal: `retention2-journal.jsonl`.

## case 5 (ORA-3301..3310): no phantom deletion, no phantom retention — PROVEN x10
10 files, keep 6: exactly the 4 eligible deleted, exactly the 6 ineligible
remain. Deleted set == eligible set computed independently. Nothing extra
deleted, nothing eligible retained.

## case 6 (ORA-3311..3320): retention matrix reviewed — PROVEN x10
10 subjects x {policy, numbers, window}: matrix complete, every cell filled,
reviewed flag set. The matrix is the reviewed design-spec.

## case 7 (ORA-3321..3330): evidence hold overrides retention — PROVEN x10
100-day-old file under hold: retained while an equally old unheld file was
pruned. Hold released -> the file becomes eligible and is pruned. Hold wins
over retention while active; release restores normal policy.

## case 8 (ORA-3331..3340): dry-run lists candidates before deletion — PROVEN x10
Dry-run listed 5 candidates, deleted 0 (journal marks dry_run=True). The real
run then deleted exactly the listed set. Preview matches execution.

## case 9 (ORA-3341..3350): forensic window explicit — PROVEN x10
7-day window for exit-137 artifacts: 6-day-old retained, 8-day-old pruned.
Boundary behavior verified, window explicit in the matrix.
