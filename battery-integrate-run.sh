#!/bin/bash
# Wave-4 stream 1: run the swarm-02 F-01/F-02 battery against the integration
# worktree (/home/nolan/ping-integrate) using an ISOLATED scratch postgres.
# Rationale: the shared scratch containers' (ping-test-pg:55433,
# swarm02-pg:55434) postgres passwords are undocumented and unrecoverable;
# pg_hba demands SCRAM over the published-port NAT path, and pg 8.23 refuses
# empty passwords client-side. This container is created for this run only
# and removed afterwards -- zero impact on shared infra.
# The DB password is generated on this machine, used transiently, never
# written to any file.
set -u
PW="$(openssl rand -hex 16)"
PORT=55435
CNAME="swarm02-integrate-pg"
LOG="/home/nolan/swarm02-tests/battery-integrate-20260924.log"
TESTDIR="/home/nolan/swarm02-tests"

cleanup() {
  docker rm -f "$CNAME" >/dev/null 2>&1 || true
  unset PIG_PGPASSWORD || true
}
trap cleanup EXIT

docker run -d --name "$CNAME" -e POSTGRES_PASSWORD="$PW" \
  -p "127.0.0.1:${PORT}:5432" postgres:17-alpine >/dev/null
for i in $(seq 1 30); do
  if docker exec "$CNAME" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec -e PGPASSWORD="$PW" "$CNAME" psql -U postgres -h 127.0.0.1 \
  -c "CREATE DATABASE swarm02_test;" >/dev/null

# Explicit port+password verification from the host (task requirement):
export PIG_PGPASSWORD="$PW"
cd "$TESTDIR"
node -e "
const {Client}=require('pg');
(async()=>{
  const c=new Client({host:'127.0.0.1',port:${PORT},user:'postgres',password:process.env.PIG_PGPASSWORD,database:'swarm02_test'});
  await c.connect();
  const r=await c.query('SELECT current_database() AS db');
  console.log('SCRATCH-DB-VERIFY: port=${PORT} password-auth OK db='+r.rows[0].db);
  await c.end();
})().catch(e=>{console.error('SCRATCH-DB-VERIFY FAIL: '+e.message);process.exit(1);});
"

PIG_REPO=/home/nolan/ping-integrate PIG_PGPORT=$PORT PIG_PGDATABASE=swarm02_test \
  node --test --test-concurrency=1 \
  08-duplicate-dispatch.test.mjs 09-timeout-before-effect.test.mjs \
  10-timeout-after-effect.test.mjs 11-retry-safe-vs-unsafe.test.mjs \
  12-partial-dag-completion.test.mjs 13-restart-coordinator.test.mjs \
  14-reconciliation.test.mjs > "$LOG" 2>&1
BEXIT=$?
echo "battery exit=$BEXIT"
grep -E "^# (pass|fail)" "$LOG" | tail -4
