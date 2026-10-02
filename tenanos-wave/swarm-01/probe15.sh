#!/bin/bash
# SWARM-01 probe 15: bridge->mission tenant flow, worker namespace, requirePG (read-only)
P=/home/nolan/ping
echo "########## event_bridge 225-300 ##########"
sed -n 225,300p $P/ping-runtime/events/event_bridge.js
echo "########## mission_runtime create() ##########"
grep -n "async create" -A 40 $P/ping-runtime/orchestration/mission_runtime.js | head -60
echo "########## worker_runtime 60-110 ##########"
sed -n 60,110p $P/ping-runtime/workers/worker_runtime.js
echo "########## requirePG def ##########"
grep -n "requirePG" $P/gateway/routes/mission_control.js | head -3
grep -n "function requirePG\|const requirePG" -A 12 $P/gateway/routes/mission_control.js | head -20
echo "########## unified_event_runtime 95-115 ##########"
sed -n 95,115p $P/ping-runtime/events/unified_event_runtime.js
