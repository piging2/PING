# Phase 10: Backup Improvements and Isolated Restore Test, 2026-09-17

Status: COMPLETE. Restore tested in full isolation, paperwork delivered.
No commits, no pushes, no credential values printed, no off-host transfer,
no new timers, no changes to playbook revision 194a2b85bde957ed.

## 1. Capacity check (ran first)

Oracle host ping-core-01, measured 2026-09-17 ~05:50 MDT:

- Disk: 45 GB total, 18 GB used, 27 GB available (40% used).
- Memory: 5903 MB total, 5175 MB available, 99 MB free + 5293 MB buff/cache, no swap.
- Load average: 0.26 / 0.32 / 0.18. Host NOT under memory pressure.
- Sizing vs the test: Qdrant snapshot 67 MB, pg_dump 0.16 MB uncompressed to a
  few MB; an isolated Postgres needs ~100 MB volume overhead. Total test
  footprint under 300 MB against 27 GB free. Verdict: SAFE, restore test
  proceeded. Neither Postgres nor Qdrant restore was BLOCKED_CAPACITY.

## 2. Isolated restore test

Ran the runnable procedure in phase10/restore-verify.sh (same script kept as
paperwork). All isolation rules held throughout.

### Postgres

- Test resources: container `ping-restore-test-pg`, volume `pg_restore_test`,
  port `127.0.0.1:15433`, database `restoretest`, user `pingtest`, one-time
  generated password (destroyed with the container, never recorded).
  Image `postgres:17-alpine`, already on host, no pull.
- Restore: `pg_restore` path was plain-SQL pipe with `-v ON_ERROR_STOP=1`.
  Exit 0. Full DDL + COPY + index + trigger replay visible in the log.
- Verification against the restored DB:
  - public tables: 31 (expect 31). All 31 canonical table names present,
    including ping_events and ping_missions.
  - ping_events: 1153 rows.
  - ping_missions: 221 rows.

### Qdrant

- Test resources: container `qdrant-restore-test`, volume
  `qdrant_restore_test`, port `127.0.0.1:16333`. Image `qdrant/qdrant:v1.7.0`,
  already on host, no pull.
- Restore: snapshot upload endpoint
  `POST /collections/knowledge/snapshots/upload?priority=snapshot` returned
  `{"result":true,"status":"ok"}`.
- Verification: collection `knowledge`, status green, optimizer ok,
  points_count 13, vectors_count 13, vectors 768-dim cosine, segments 2.
  Matches the backup-time snapshot point count (13) exactly.

### Teardown

`docker rm -f` on both test containers, `docker volume rm` on both test
volumes. Final audit: `docker ps` shows only ping-gateway, ping-postgres,
ping-qdrant (all healthy); `docker volume ls` shows only oracle_pgdata and
oracle_qdrant_storage. Zero test leftovers.

### Verdict: VERIFIED (with one honest manifest flag)

Both restores completed in full isolation, both verifications passed, teardown
clean. One discrepancy, classified as manifest-vs-artifact (not a restore
failure): Agent F's RESTORE-2026-09-16.md states backup-time counts of
1158 ping_events / 222 ping_missions, but the dump payload actually contains
1153 / 221 (counted directly in the artifact on Oracle, twice). The restored
DB matches the artifact payload exactly (1153 / 221), so the restore is
faithful; the guide's numbers appear to have raced live writes taken moments
before or after the dump. Live counts at test time: ping_events 1380,
ping_missions 264, 31 tables. The new checksum manifest in phase10 records
the artifact hashes; future manifests should record counts taken inside the
same transaction as the dump (or note the race).

## 3. Paperwork (all in /home/hatch/workspace/ping-overnight/phase10/)

- `BACKUP_MANIFEST.md`: artifact inventory with sizes, sha256 hashes,
  verification status, the manifest discrepancy flag, and the restore test
  receipt.
- `CHECKSUMS.sha256`: sha256 of the three backup artifacts, computed on
  Oracle, hashes only copied back. Matches Agent F's recorded hashes
  character for character.
- `NAMING_CONVENTION.md`: proposal to date all artifacts in UTC at creation
  (`pgdata-backup-<UTC>.sql.gz` etc.), one directory per set, plus a
  machine-readable MANIFEST.json spec. Fixes the current 2026-09-16 name on
  a 2026-09-17T02:26Z creation.
- `RETENTION_POLICY.md`: 7 daily / 4 weekly / 3 monthly ladder proposal,
  ~1.3 GB worst case against 27 GB free, deletion safety rules (convention
  dirs only, never the newest set, logged deletions, lock file respected).
- `RESTORE_VERIFICATION_PROCEDURE.md`: step-by-step isolated restore
  procedure for Postgres, Qdrant, and the source tarball, including the
  isolation rules, the artifact-payload cross-check that caught the count
  discrepancy, the final teardown audit, and the VERIFIED / PARTIAL /
  BLOCKED_CAPACITY verdict classification.
- `restore-verify.sh`: the exact script that ran tonight's test, kept as the
  runnable form of the procedure.
- `backup-cron.sh`: recurring automation script, DISABLED BY DEFAULT.
  Triple enablement gate (env var PING_BACKUP_AUTOMATION=enabled AND a
  human-created authorization file AND no lock file); exits quietly unless
  all three hold. Does pg_dump, Qdrant snapshot, checksums, MANIFEST.json,
  and a conservative retention pass. Contains no off-host transfer step and
  does not touch ping-oci-queue.timer or any systemd timer.

## 4. Constraints honored

- No gateway restarts, no writes to the live database (one read-only count
  query batch only), no live volume mounts, no live ports/names touched.
- Sibling agents were active on the host (ping-gateway and ping-postgres had
  restarted minutes before the test); the test kept to isolated resources
  and low CPU/RAM throughout.
- Bearer/DB credentials: the live DB password was read only inside the
  Oracle shell from the container's own environment for the read-only count
  queries, never printed, never written to any file or this report. The test
  Postgres used a generated one-time password.
- No off-host transfer of backup data; no paid storage; no new cloud
  accounts; ping-oci-queue.timer untouched and still disabled.
- Playbook revision 194a2b85bde957ed untouched.

## 5. Exact next action (Nolan's decisions)

1. Accept or adjust the naming convention and retention policy proposals
   (or leave the one-shot set as the standing posture).
2. Authorize off-host backup copies and a destination (backups are still
   same-host only; host loss is the uncovered scenario).
3. Authorize enabling the backup automation (create
   /opt/ping/.backup-automation-enabled with operator + date and set the env
   gate); until then backup-cron.sh is inert.
4. Note the manifest count discrepancy for the record: the 2026-09-16 dump
   holds 1153/221, not the guide's 1158/222. No action required unless the
   guide should be corrected.
