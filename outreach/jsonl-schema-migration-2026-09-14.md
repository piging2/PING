# JSONL schema migration report, 2026-09-14

Operator: subagent owning OPEN ITEMS B (schema failures) and C (digest rebuild).

## Task brief vs. ground truth

The task brief (written from an earlier proof) said: 244 of 245 rows fail the schema because three fields added 2026-09-13 were never backfilled, and row 245 (Captain Ron Handyman L.L.C.) was the first conformant row. The actual file on disk did not match the brief:

- The JSONL held 304 rows, not 245. Every row, including all 244 pre-existing ones, already carried the three conversion fields (`conversion_state`, `converted_at`, `conversion_evidence`) as empty strings. A backfill pass (or the current append machinery, which writes all fields) had already resolved the missing-field failures.
- No Captain Ron Handyman L.L.C. row exists anywhere in the file. Nothing could be or was altered for it.
- Only 6 rows actually failed validation. The remaining "244 failures" were already resolved.

Discrepancy flagged for the parent: `pipeline.md` / `leads.md` record Captain Ron Handyman L.L.C. (Grand Junction, SOS formation 2026-07-14), Tote and Trailer Moving LLC, and AB Steel LLC as qualified new-filing WATCH prospects, but none of the three exists in the JSONL. That is a pipeline ingestion gap, outside this task's scope.

## Classification of the 6 real failures

All six are legacy-valid records with pre-enum field values (schema drift), not corruption and not missing data. Full classification is evidence-grounded: there is no git history (not a git repo), so evidence comes from the schema text itself, the `_migration_note` mechanism it defines, and exact value comparisons inside the rows.

1. Row 169, C.S. Landscaping: unknown extra fields `town` (exact duplicate of `city` = "Fruita", provable) and `confidence_primary` = "medium" (legacy name for `opportunity_confidence`; value already in-enum; that field was empty). Schema drift from an older field-name set.
2. Rows 248-249, Crystal Clear Window Washing / Yampa Valley Window Cleaners: `missed_call_risk` = "high (owner/crew on ladders in the field during fall pre-winter rush)". The canonical enum member `high` with a prose annotation appended. Pre-enum free text.
3. Rows 302-304, Haining Home Services & Airtech / Comfort Air Of Grand Junction LLC / Doubletree Heating Cooling & Fireplaces (Meta AI tandem e-pass, 2026-09-13): `missed_call_risk` = "high (...)" (same pattern as above), `opportunity_primary` = "missed-call lead capture" (a case variant of MISSED_CALL_LEAD_CAPTURE; the schema description explicitly sanctions case variants), `opportunity_secondary` = "estimate follow-up" / "after-hours dispatch triage" (no unambiguous canonical equivalent), `website_quality` = "functional" (no unambiguous canonical equivalent).

## What the migration changed

Backup first: `~/workspace/outreach/hidden_files/western-co-prospects.jsonl.pre-migration-2026-09-14.bak`.

Smallest evidence-backed migration, no invented facts:

- Row 169: dropped `town` (proven duplicate of `city`); moved legacy `confidence_primary` value "medium" into `opportunity_confidence`. Original legacy keys preserved verbatim in `_migration_note`.
- Rows 248-249: `missed_call_risk` normalized to "high"; full original string preserved in `_migration_note`.
- Rows 302-304: `missed_call_risk` to "high"; `opportunity_primary` to MISSED_CALL_LEAD_CAPTURE; `opportunity_secondary` and `website_quality` to "" (unknown, per the known-inferred-unknown rule) where no canonical equivalent exists, with originals preserved verbatim in `_migration_note`.

Result: 304/304 rows validate against `prospect-schema.json` (jsonschema Draft-07), up from 298/304. The other 298 rows are byte-identical to the backup. No rows added, none removed, no Captain Ron row existed to protect.

Migration log (append-only): `~/workspace/outreach/hidden_files/jsonl-migration-log-2026-09-14.txt`.

## Digest rebuild and determinism proof

The digest builder `~/workspace/outreach/prospect-digest.py` was not broken; it worked as designed (it had already rebuilt from the 304-row source at 08:28 today, contrary to the brief). After the migration changed the source hash, the builder rebuilt normally:

- Source JSONL sha256: `bb4b9c11afce8283216dbc0bfe56b7154e830a3671c1e916ef130fa2ab4095ac`
- Provenance sidecar `prospect-digest.provenance.json` records the same source hash, generator, schema_version 1, UTC timestamp. Restored untouched after the proof run.
- Determinism: built twice from the same source (sidecar stashed aside to force a second full build, then restored). Both digest outputs sha256-identical: `815d9e88a77ad5af38b37b4a978a079cff7a21061e49490d0a5a26d9efe5fdaa` (17,101 chars).
- Digest content spot check: 304 businesses tracked, 300 active, HOT: 3, no em dashes anywhere.

SOURCE -> BUILD -> DIGEST is deterministic and byte-identical.

## Open items for the parent

- Captain Ron Handyman L.L.C., Tote and Trailer Moving LLC, and AB Steel LLC were qualified in `pipeline.md` but were never appended to the canonical JSONL. If Nolan wants them in the prospect record, the ingest step (Meta AI b-pass step 4e) needs to run for them.
- The 244-failure proof the brief cited appears to have predated a backfill pass. Recommend treating that proof as superseded; current state is 304/304 valid.
- No new schedulers, databases, or authorities were created. Nothing here needs Nolan's attention.
