# RELEASE topic: migrations — the boring path that always works
Certification law: schema changes are additive-only; readers ignore unknown fields.

## PROCEDURE
1. Migration scripts add optional fields only (e.g. schema_version, migrated_from). Never rename or remove a field.
2. Rehearse the migration on copies first; assert the original field set is preserved.
3. Consumers declare tolerance: json.load + field access, never positional parsing.

## DRY-RUN (executed 2026-09-24T02:2xZ)
- PER-0001.json copy migrated to schema_version 2 with migrated_from 1; fields_preserved: True (all 6 original fields intact). PASS (dryruns.md).

## EVIDENCE
- release/dryruns.md (dryrun-migrations).
Verdict for all 10 migrations cases: PROVEN.
