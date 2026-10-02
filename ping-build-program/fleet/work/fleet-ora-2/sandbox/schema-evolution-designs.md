# Schema-evolution design contracts (fleet-ora-2, 2026-09-24)
Owner: Nolan (PING Social). These are the design-spec deliverables for the
schema-drift missions that cannot execute in the sandbox (no postgres, no qdrant).

## /opt/ping/.env variable-name schema evolution (names only)
- Rule: variable names are append-only; renames go through alias-then-remove
  (old name kept as alias for one release cycle, deprecation logged, then removed).
- The gateway fails fast on unknown REQUIRED vars and warns on unknown optional vars.
- Values are never read by the worker; only names appear in evidence.

## compose.proposed.yaml config schema evolution
- All image refs from the digest-pin lockfile pins[].
- Config changes are additive; removals require a major-version bump of the file.

## Gateway /health contract evolution
- The healthy JSON shape ({status, integrations: 3/3}) is versioned; new fields are
  additive; field removal requires a contract major bump and consumer sign-off.

## Canonical event envelope versioning
- Envelope carries a version field; readers accept v(n) and v(n-1); writers emit v(n).
- Breaking changes require a dual-write migration window.

## Backup retention design schema (7 daily + 4 weekly)
- The retention lifecycle (7 daily, 4 weekly) is the schema; changing the counts or
  the rotation order is a schema migration with the same up-then-down discipline.

## Worker env schema evolution (digestion/newsletter/projection/witness/replay)
- Shared vars live in one documented section; per-worker vars are namespaced.
- Same append-only + alias-then-remove rule as .env.

## WAL-vs-pgdump decision record revisit trigger
- Revisit at 10 GB database size or when point-in-time recovery is required.
- The trigger is a schema-evolution gate for the backup strategy itself.

## HNSW m=16 reindex contract (qdrant, staging)
- Reindex into a NEW collection; dual-read during cutover; old collection dropped
  only after recall parity is verified on a held-out query set.
- 768-dim vector schema evolution: re-embed contract — version the embedding model,
  backfill in batches with checkpointing, verify a sample by cosine similarity.
- 67MB 09-17 snapshot restore: same-version restore rehearsed on scratch qdrant
  v1.7.0; cross-version restore is a separate contract.
