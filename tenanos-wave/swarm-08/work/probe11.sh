#!/bin/bash
# swarm-08 probe 11: find CREATE TABLE DDL in JS + DB connection details (read-only)
set -u
echo "=== DDL in JS ==="
timeout 120 grep -rln "CREATE TABLE IF NOT EXISTS ping_missions\|CREATE TABLE ping_missions" /home/nolan/ping --include='*.js' 2>/dev/null | grep -v worktrees | grep -v node_modules | head -5
echo "=== env base DB ==="
grep -i "postgres\|PG\|DATABASE" /home/nolan/ping/.env.base 2>/dev/null | sed 's/=.*/=***/' | head -15
echo "=== unified_event_runtime ensureSchema ==="
grep -n "ensureSchema\|CREATE TABLE" /home/nolan/ping/ping-runtime/events/unified_event_runtime.js | head -20
