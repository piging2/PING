#!/bin/bash
# SWARM-01 probe 11: resolveNamespace, mission runtime, qdrant adapter, workers (read-only)
P=/home/nolan/ping
echo "########## resolveNamespace ##########"
grep -n "resolveNamespace" -A 45 $P/ping-runtime/canonicalization/canonicalization_service.js | head -70
echo "########## mission_runtime.js head + create/list ##########"
grep -n -i "class\|constructor\|createMission\|listMissions\|tenant\|namespace" $P/ping-runtime/orchestration/mission_runtime.js | head -40
echo "########## routes/missions.js ##########"
grep -n "router\.\|tenant\|namespace\|mission" $P/gateway/routes/missions.js | head -40
echo "########## qdrant_adapter collections ##########"
grep -n -i "collection\|tenant\|namespace" $P/ping-runtime/search/qdrant_adapter.js | head -40
echo "########## worker_runtime tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/workers/worker_runtime.js | head -20
