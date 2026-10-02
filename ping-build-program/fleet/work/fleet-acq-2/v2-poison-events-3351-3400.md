# v2 poison-events 3351-3400: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/poison_lab.py`;
evidence: `poison-evidence.json`. Ingest pipeline: validate -> classify ->
bounded retries (3) -> quarantine with evidence -> dead-letter.

## case 0 (ORA-3351..3360): quarantined with evidence, never retried forever — PROVEN x10
All 10 poison subjects (corrupt gz, corrupt snapshot, malformed JSON, oversized,
duplicate, ID collision, poison env shape, poison healthcheck, vector dim
mismatch, reordered) quarantined with kind + evidence. Retries stop at the
budget; nothing spins.

## case 1 (ORA-3361..3370): retry budget respected, then dead-letter — PROVEN x10
Every poison item attempted exactly 3 times then dead-lettered. DLQ holds all
110 poison items (10 subjects + 100 flood). No item retried a 4th time.

## case 2 (ORA-3371..3380): poison never enters canonical state — PROVEN x10
Canonical store holds 0 poison items after the full run. Validation happens
before any canonical write; rejection is total.

## case 3 (ORA-3381..3390): classified into the failure taxonomy — PROVEN x10
Every quarantine record carries a taxonomy kind: CORRUPT_BYTES (x2), MALFORMED,
OVERSIZED, DUPLICATE, COLLISION, SCHEMA (x2), DIM_MISMATCH, REORDERED. All 8
kinds in the taxonomy were exercised.

## case 4 (ORA-3391..3400): quarantine store bounded — PROVEN x10
110 poison items pushed against a cap of 50: quarantine holds exactly 50, the
60 oldest evicted with journal events. No unbounded growth.
