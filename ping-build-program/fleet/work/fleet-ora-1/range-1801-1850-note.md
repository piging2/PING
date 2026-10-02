# Schema-drift range note (fleet-ora-1, 2026-09-24T03:23:09Z)

Read-only listing of /opt/ping/database/ on ping-core-01:
  canonical_events.sql, events.sql, fix_pipeline_blockers.sql,
  migration_001_add_causation_id.sql, migration_002_add_events_causation_id.sql

No schema-v0..v19 artifacts exist; those mission subjects are generator-synthesized f-strings
(gen_matrices.py). Running up/down migrations against the live ping-postgres baseline would
mutate certified state, so it is forbidden even if a subject existed.
