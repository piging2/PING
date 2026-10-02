#!/bin/bash
# swarm-08 probe 10: locate ping_missions DDL + DB connection config (read-only)
set -u
echo "=== search DDL across repo (bounded) ==="
timeout 90 grep -rln "CREATE TABLE" /home/nolan/ping/ping-runtime --include='*.sql' 2>/dev/null | head -10
echo "=== migrations dirs ==="
timeout 30 find /home/nolan/ping -maxdepth 2 -type d -iname '*migrat*' 2>/dev/null | grep -v worktrees | grep -v node_modules | head
echo "=== schema files ==="
timeout 60 grep -rln "ping_missions" /home/nolan/ping --include='*.sql' 2>/dev/null | grep -v worktrees | head -10
echo "=== DB env/config ==="
ls /home/nolan/ping/gateway/*.env* /home/nolan/ping/.env* 2>/dev/null | head
timeout 30 grep -rn "DATABASE_URL\|PGHOST\|5433" /home/nolan/ping/gateway/config.js /home/nolan/ping/gateway/db.js 2>/dev/null | head -10
