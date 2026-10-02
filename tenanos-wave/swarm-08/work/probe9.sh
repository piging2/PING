#!/bin/bash
# swarm-08 probe 9: schema — tenant columns in ping_missions/ping_events; tenant references in mission_control.js (read-only)
set -u
echo "=== tenant mentions in mission_control.js ==="
grep -n -i "tenant" /home/nolan/ping/gateway/routes/mission_control.js | head -20
echo "=== find migrations creating ping_missions / ping_events ==="
timeout 60 grep -rl "CREATE TABLE.*ping_missions\|CREATE TABLE IF NOT EXISTS ping_missions" /home/nolan/ping --include='*.sql' 2>/dev/null | grep -v worktrees | head -5
timeout 60 grep -rln "ping_missions" /home/nolan/ping/migrations 2>/dev/null | head -5
ls /home/nolan/ping | head -40
