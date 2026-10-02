# Range 1751-1800 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-1751..1800: family schema-drift (first 50 of 200; family spans ORA-1751..ORA-1950).
"Schema drift: {it} — migration compatibility both directions" (it = schema-v0..schema-v19)
Pass criterion: "Migrate {it} up then down: data intact, digests match; FAIL on silent field loss."

## Evidence (read-only SSH probes)
1. Generator source (gen_matrices.py): items are `[f"schema-v{i}" for i in range(20)]` — f-string placeholders.
2. Real migration inventory on the Oracle host (/opt/ping/database/):
   canonical_events.sql, events.sql, fix_pipeline_blockers.sql,
   migration_001_add_causation_id.sql, migration_002_add_events_causation_id.sql
   Plus /opt/ping/gateway/migration_engine.js (the engine that runs them).
3. Zero files, engine registrations, or version rows reference "schema-v0".."schema-v19".
   The named versions do not exist; the pass criterion (migrate schema-vN up then down) is unevaluable.

## Why not NEEDS-FOLLOWUP for the named missions
NEEDS-FOLLOWUP implies the mission is executable later. These missions name fictional versions; the correct
repair is regenerating the family against the REAL migration list. A staging up/down drill of the real
migrations is the legitimate followup work (see below).

## Real followup design (for the regenerated family)
On a staging clone with a copy of the production database:
  1. Snapshot data digests (row counts + event-digest chain from the constitutional snapshot).
  2. For each real migration in version order: run migration_engine.js up; verify application; run down;
     verify rollback; re-run up to leave staging at head.
  3. After each up and down: compare digests — PASS: data intact, digests match; FAIL: silent field loss.
  4. The engine must support down-migrations for every up-migration; if any migration lacks a down path,
     that is a REJECTED finding for that migration (data-loss risk), not a skip.
  Never run up/down drills against the live production database.

## Verdicts
All 50: N-A with justification (named schema-vN are generator-synthesized; no such versions exist).
Followup: regenerate the schema-drift family from the real migration inventory above; run the up/down
drill on staging per the design.
