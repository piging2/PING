# PING Backup Manifest (current set, on-host only)

Generated: 2026-09-17 ~05:55 MDT by Phase 10. Hashes computed on Oracle
(host ping-core-01, user ubuntu) via sha256sum; only hashes were copied back,
never the artifact contents.

Status: SAME-HOST ONLY. No off-host copy exists as of this writing. These
backups protect against database corruption and operator error, not against
host loss. Off-host copies need Nolan's authorization.

## Artifact inventory (all in /opt/ping/releases/ on ping-core-01)

| Artifact | Size (bytes) | sha256 | Contents verified |
|---|---|---|---|
| pgdata-backup-2026-09-16.sql.gz | 160,927 | 10e315c3ef2570e210149db95b6f57ad4268b6a4816d37764a9bc40875d8f51e | gzip -t PASS; 31 CREATE TABLE; dump payload holds 1153 ping_events rows, 221 ping_missions rows |
| qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot | 67,375,104 | b0a0aa29aca7bc5abb98d4fd303070ba94d65eb106babbf2feef4143a04edfc5 | upload-recover into isolated Qdrant v1.7.0 PASS; collection knowledge, 13 points, status green |
| ping-source-clean-2026-09-16.tar.gz | 26,628,632 | 962beb7c53385c6771dd2197fbca86ac4f67867d9477cab81564d7aba8cb3ed6 | gzip -t PASS; 2,902 entries; case-insensitive audit zero matches for .env / secret / credential / .key / .bak |
| RESTORE-2026-09-16.md | 3,379 | (text doc, not hashed in manifest) | Isolated restore procedure by Agent F; sha256 in guide matches artifacts above |

## Naming note

The set is dated 2026-09-16 but was created 2026-09-17T02:26:35Z
(2026-09-16 evening MDT). The proposed naming convention in
NAMING_CONVENTION.md resolves this by dating artifacts in UTC at creation time.

## Known manifest discrepancy (honest flag)

Agent F's restore guide records backup-time counts of 1158 ping_events and
222 ping_missions. The dump payload actually contains 1153 ping_events rows
and 221 ping_missions rows (counted directly in the artifact, twice, on
Oracle). The isolated restore reproduced the artifact exactly (1153 / 221),
so the restore is faithful; the guide's count appears to have raced live
writes taken moments before or after the dump. Live counts at Phase 10 test
time (2026-09-17 ~05:50 MDT): ping_events 1380, ping_missions 264, 31 tables.

## Restore test receipt

Phase 10 isolated restore test, 2026-09-17 ~05:55 MDT:
- Postgres: separate container ping-restore-test-pg, volume pg_restore_test,
  port 127.0.0.1:15433, database restoretest, generated one-time password.
  Restore exit 0. 31/31 tables present, all 31 canonical tables listed.
  ping_events 1153, ping_missions 221 (matches artifact payload).
- Qdrant: separate container qdrant-restore-test, volume qdrant_restore_test,
  port 127.0.0.1:16333, snapshot upload API returned ok, collection
  knowledge green, points_count 13, vectors_count 13 (768-dim cosine).
- Teardown complete: both test containers and both test volumes removed;
  only ping-gateway, ping-postgres, ping-qdrant and live volumes
  oracle_pgdata / oracle_qdrant_storage remain.
