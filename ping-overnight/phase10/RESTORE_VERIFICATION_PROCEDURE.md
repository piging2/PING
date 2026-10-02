# PING Restore Verification Procedure

This is the exact procedure Phase 10 ran on 2026-09-17 and the one to repeat
for every future backup set. The runnable script version lives in
`restore-verify.sh` in this directory. Read the isolation rules first; they
are the whole point.

## Isolation rules (non-negotiable)

- NEVER restore into live ports 5432, 6333, 8080.
- NEVER restore into live volumes oracle_pgdata, oracle_qdrant_storage.
- NEVER reuse live container names ping-postgres, ping-qdrant, ping-gateway.
- Test containers bind only to 127.0.0.1 on non-live ports.
- No gateway restarts, no writes to the live database, no live volume mounts.
- Teardown is mandatory at the end of every run.

## Postgres restore test

1. Create the test volume: `docker volume create pg_restore_test`
2. Generate a one-time password: `PW=$(openssl rand -hex 16)` (destroyed with
   the container; never written to a file or report).
3. Start the isolated container:
   `docker run -d --name ping-restore-test-pg -e POSTGRES_PASSWORD="$PW" -e POSTGRES_USER=pingtest -e POSTGRES_DB=restoretest -p 127.0.0.1:15433:5432 -v pg_restore_test:/var/lib/postgresql/data postgres:17-alpine`
4. Wait for readiness (loop `docker exec ping-restore-test-pg pg_isready -U pingtest`, 30 tries).
5. Copy the dump in and restore:
   `docker cp <set>/pgdata-backup-<UTC>.sql.gz ping-restore-test-pg:/tmp/restore.sql.gz`
   `docker exec ping-restore-test-pg sh -c 'gunzip -c /tmp/restore.sql.gz | psql -U pingtest -d restoretest -v ON_ERROR_STOP=1'`
   Restore must exit 0 with ON_ERROR_STOP set; any error is a FAIL.
6. Verify, and record all three numbers:
   - table count from information_schema = expected count from the manifest
   - `select count(*) from ping_events` = expected count
   - `select count(*) from ping_missions` = expected count
   - list all public tables and confirm the canonical tables exist
     (ping_events, ping_missions, plus the rest of the 31).
7. Cross-check the artifact itself: count the COPY payload rows for
   ping_events and ping_missions inside the .sql.gz (awk between
   `COPY public.ping_events ... FROM stdin;` and the terminating `\.`).
   Restored DB counts must equal artifact payload counts exactly. If the
   manifest's stated backup-time counts differ from the payload, flag it as
   a manifest discrepancy (this happened in the 2026-09-16 set: manifest said
   1158/222, payload holds 1153/221) but do NOT mark the restore failed.
8. Teardown: `docker rm -f ping-restore-test-pg; docker volume rm pg_restore_test`.

## Qdrant restore test

1. Create the test volume: `docker volume create qdrant_restore_test`
2. Start the isolated container:
   `docker run -d --name qdrant-restore-test -p 127.0.0.1:16333:6333 -v qdrant_restore_test:/qdrant/storage qdrant/qdrant:v1.7.0`
3. Wait for readiness (loop `curl -sf http://127.0.0.1:16333/`).
4. Upload the snapshot:
   `curl -X POST "http://127.0.0.1:16333/collections/knowledge/snapshots/upload?priority=snapshot" -F "snapshot=@<snapshot-file>;type=application/octet-stream"`
   Response must be `{"result":true,"status":"ok",...}`.
5. Verify: `GET http://127.0.0.1:16333/collections/knowledge` must show
   status green and points_count equal to the manifest's snapshot point
   count (13 for the 2026-09-16 set). Record vectors_count and the vector
   config (size 768, distance Cosine) as a sanity check.
6. Teardown: `docker rm -f qdrant-restore-test; docker volume rm qdrant_restore_test`.

## Source tarball check

`gzip -t` must PASS. `tar -tzf` entry count must match the manifest.
Case-insensitive filename audit for .env / secret / credential / .key / .bak
must return zero hits. Extract to a scratch dir and diff against the live
tree only as reference; never overlay live paths.

## Final teardown audit

After every run, `docker ps` must show only the live containers
(ping-gateway, ping-postgres, ping-qdrant) and `docker volume ls` must show
only the live volumes (oracle_pgdata, oracle_qdrant_storage). Anything else
is a leftover test resource: remove it before closing the run.

## Verdict classification

- VERIFIED: restore exit 0, all counts match artifact payload, Qdrant green
  with expected points, teardown complete.
- PARTIAL: restore works but a manifest discrepancy or a skipped check exists;
  name it explicitly.
- BLOCKED_CAPACITY: free disk under 2 GB or free memory under 1 GB on the
  host; do not attempt the restore, record the numbers, still do the
  paperwork.
