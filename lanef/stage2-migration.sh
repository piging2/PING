#!/bin/bash
# Lane F stage 2: scratch PG container + migration certification gate (fixture for release-certify gate 6).
set -u
PASSFILE=/tmp/lanef/pgpass
if [ ! -f "$PASSFILE" ]; then
  openssl rand -hex 24 > "$PASSFILE"
  chmod 600 "$PASSFILE"
fi
docker network create lanef-cert-net 2>/dev/null || true
docker rm -f lanef-pg 2>/dev/null || true
# 15433/5434 are held by the prior candidate's staging sandbox; use 15434/15435 (checked free).
docker run -d --name lanef-pg --network lanef-cert-net \
  -e POSTGRES_PASSWORD="$(cat $PASSFILE)" \
  -p 15434:5432 -p 15435:5432 postgres:16 >/dev/null
echo "waiting for postgres readiness..."
for i in $(seq 1 30); do
  if docker exec lanef-pg pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec lanef-pg pg_isready -U postgres
echo "--- migration cert (candidate a9cad2663, UER real code path) ---"
cd /home/nolan/worktrees/constitutional-convergence
export PGHOST=127.0.0.1 PGPORT=15434 PGUSER=postgres
export PGPASSWORD="$(cat $PASSFILE)"
node ping-runtime/events/migration-certification/certify-sequence-migration.js > /tmp/lanef/migration-cert.log 2>&1
echo "MIGRATION_CERT_EXIT=$?"
tail -8 /tmp/lanef/migration-cert.log
grep -c "^  PASS" /tmp/lanef/migration-cert.log
grep -c "^  FAIL" /tmp/lanef/migration-cert.log || true
