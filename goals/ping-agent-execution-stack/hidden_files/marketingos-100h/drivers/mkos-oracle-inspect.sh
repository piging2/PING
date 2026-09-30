#!/bin/bash
# READ-ONLY inspection of Oracle journal sealing. No writes. No secrets printed.
set -u
echo '=== oracle gateway container ==='
docker inspect ping-gateway --format 'name={{.Name}} state={{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}} image={{.Config.Image}}' 2>&1
echo '=== role ping: superuser? ==='
docker exec ping-postgres psql -U ping -d crx_runtime -tAc \
  "SELECT rolname, rolsuper FROM pg_roles WHERE rolname='ping';" 2>&1
echo '=== db-role settings (the ALTER ROLE ... SET claim) ==='
docker exec ping-postgres psql -U ping -d crx_runtime -c \
  "SELECT d.datname, r.rolname, s.setconfig FROM pg_db_role_setting s LEFT JOIN pg_database d ON d.oid=s.setdatabase LEFT JOIN pg_roles r ON r.oid=s.setrole;" 2>&1
echo '=== session default as role ping, fresh session ==='
docker exec ping-postgres psql -U ping -d crx_runtime -tAc \
  "SHOW default_transaction_read_only;" 2>&1
echo '=== journal row count (seal check, read-only) ==='
docker exec ping-postgres psql -U ping -d crx_runtime -tAc \
  "SELECT count(*) FROM ping_events;" 2>&1
echo '=== append-only triggers present? ==='
docker exec ping-postgres psql -U ping -d crx_runtime -tAc \
  "SELECT tgname FROM pg_trigger WHERE tgrelid='ping_events'::regclass AND NOT tgisinternal;" 2>&1
