#!/bin/bash
# Lane F stage 2 retry: migration cert with NODE_PATH bootstrap (pg driver from gateway/node_modules).
set -u
R=/home/nolan/worktrees/constitutional-convergence
export PGHOST=127.0.0.1 PGPORT=15434 PGUSER=postgres
export PGPASSWORD="$(cat /tmp/lanef/pgpass)"
export NODE_PATH="$R/gateway/node_modules"
node "$R/ping-runtime/events/migration-certification/certify-sequence-migration.js" > /tmp/lanef/migration-cert.log 2>&1
code=$?
echo "$code" > /tmp/lanef/migration-cert.exit
echo "MIGRATION_CERT_EXIT=$code"
tail -6 /tmp/lanef/migration-cert.log
echo "PASS count: $(grep -c '^  PASS' /tmp/lanef/migration-cert.log)"
echo "FAIL count: $(grep -c '^  FAIL' /tmp/lanef/migration-cert.log || true)"
