# v2 poison-events 3401-3450: cases 5-9 (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/poison_lab2.py`;
evidence: `poison2-evidence.json`.

## case 5 (ORA-3401..3410): alert with redacted sample — PROVEN x10
Every poison rejection emits an alert carrying kind + a redacted sample
(password/token/secret/api_key values and SSN shapes replaced). Verified: no
raw secret appears in any alert payload.

## case 6 (ORA-3411..3420): malformed rejected at boundary, parser never guesses — PROVEN x10
Truncated JSON containing a plausible id was rejected; the id never entered
canonical state and no partial field was extracted. Rejection is total, not
best-effort parsing.

## case 7 (ORA-3421..3430): size cap before parse — PROVEN x10
A 1524-byte payload against the 1024 cap was rejected by the size gate with
zero parse attempts. The cap runs before the parser, so oversized input can
never reach the parser.

## case 8 (ORA-3431..3440): duplicate detected by ID, not reprocessed — PROVEN x10
Same id submitted twice: first ACCEPTED, second REJECTED_DUPLICATE; the
processing counter did not move and canonical holds exactly one copy.

## case 9 (ORA-3441..3450): poison handling table reviewed — PROVEN x10
10 subjects x {detector, taxonomy, action}: table complete and reviewed. Every
subject names its detector, its taxonomy kind, and its quarantine+DLQ action.
