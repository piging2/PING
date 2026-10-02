#!/bin/bash
# swarm-08 probe 13: unifiedEventRuntime.query() filters + tenants surface (read-only)
set -u
UR=/home/nolan/ping/ping-runtime/events/unified_event_runtime.js
echo "### query() implementation ==="
awk '/async query\(/,/^\s{2}\}/' "$UR" | head -100
echo ""
echo "### getCorrelationGroup ==="
grep -n "async getCorrelationGroup" "$UR"
echo ""
echo "### tenants table DDL (search) ==="
timeout 60 grep -rn "CREATE TABLE IF NOT EXISTS.*tenant" /home/nolan/ping/ping-runtime --include='*.js' 2>/dev/null | head -5
echo ""
echo "### tenants.js route head ==="
head -60 /home/nolan/ping/gateway/routes/tenants.js
