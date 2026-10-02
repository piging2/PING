#!/bin/bash
# swarm-08 probe 12: read ping_missions + ping_events DDL for tenant columns (read-only)
set -u
echo "### ping_missions DDL ==="
grep -n "CREATE TABLE IF NOT EXISTS ping_missions" /home/nolan/ping/ping-runtime/orchestration/mission_runtime.js
awk '/CREATE TABLE IF NOT EXISTS ping_missions/,/;/' /home/nolan/ping/ping-runtime/orchestration/mission_runtime.js | head -40
echo ""
echo "### ping_events DDL ==="
sed -n '40,110p' /home/nolan/ping/ping-runtime/events/unified_event_runtime.js
