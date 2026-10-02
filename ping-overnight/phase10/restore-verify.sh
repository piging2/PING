#!/bin/bash
# Phase 10 isolated restore test - POSTGRES + QDRANT.
# All resources are isolated: test-only container names, volumes, ports, credentials.
# NEVER point these at live ports (5432/6333/8080), live volumes (oracle_pgdata,
# oracle_qdrant_storage), or live container names (ping-postgres, ping-qdrant, ping-gateway).
set +e

echo "=== 1. POSTGRES ISOLATED RESTORE ==="
docker volume create pg_restore_test
PW=$(openssl rand -hex 16)
docker run -d --name ping-restore-test-pg \
  -e POSTGRES_PASSWORD="$PW" -e POSTGRES_USER=pingtest -e POSTGRES_DB=restoretest \
  -p 127.0.0.1:15433:5432 -v pg_restore_test:/var/lib/postgresql/data \
  postgres:17-alpine

for i in $(seq 1 30); do
  docker exec ping-restore-test-pg pg_isready -U pingtest >/dev/null 2>&1 </dev/null && break
  sleep 2
done
docker exec ping-restore-test-pg pg_isready -U pingtest </dev/null

docker cp /opt/ping/releases/pgdata-backup-2026-09-16.sql.gz ping-restore-test-pg:/tmp/restore.sql.gz
docker exec ping-restore-test-pg sh -c 'gunzip -c /tmp/restore.sql.gz | psql -U pingtest -d restoretest -v ON_ERROR_STOP=1' </dev/null
echo "PG_RESTORE_EXIT=$?"

echo "--- pg verification ---"
TABLES=$(docker exec ping-restore-test-pg sh -c 'psql -U pingtest -d restoretest -Atc "select count(*) from information_schema.tables where table_schema='"'"'public'"'"' and table_type='"'"'BASE TABLE'"'"'" </dev/null')
EVENTS=$(docker exec ping-restore-test-pg sh -c 'psql -U pingtest -d restoretest -Atc "select count(*) from ping_events" </dev/null')
MISSIONS=$(docker exec ping-restore-test-pg sh -c 'psql -U pingtest -d restoretest -Atc "select count(*) from ping_missions" </dev/null')
echo "PG_TABLES=$TABLES (expect 31)"
echo "PG_EVENTS=$EVENTS (expect 1158)"
echo "PG_MISSIONS=$MISSIONS (expect 222)"
docker exec ping-restore-test-pg sh -c 'psql -U pingtest -d restoretest -Atc "select tablename from pg_tables where schemaname='"'"'public'"'"' order by 1" </dev/null'

echo "=== 2. QDRANT ISOLATED RESTORE ==="
docker volume create qdrant_restore_test
docker run -d --name qdrant-restore-test \
  -p 127.0.0.1:16333:6333 -v qdrant_restore_test:/qdrant/storage \
  qdrant/qdrant:v1.7.0
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:16333/ >/dev/null 2>&1 && break
  sleep 2
done
SNAP=/opt/ping/releases/qdrant-snapshots-2026-09-16/knowledge-knowledge-7722890700902776-2026-09-17-02-26-36.snapshot
echo "--- uploading snapshot ---"
curl -s -X POST "http://127.0.0.1:16333/collections/knowledge/snapshots/upload?priority=snapshot" \
  -F "snapshot=@$SNAP;type=application/octet-stream" | head -c 300; echo
echo "--- collection state ---"
curl -s http://127.0.0.1:16333/collections/knowledge; echo

echo "=== 3. TEARDOWN (test resources only) ==="
docker rm -f ping-restore-test-pg qdrant-restore-test
docker volume rm pg_restore_test qdrant_restore_test
echo "--- remaining containers ---"
docker ps --format '{{.Names}} {{.Status}}'
echo "--- remaining volumes ---"
docker volume ls
