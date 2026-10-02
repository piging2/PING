#!/bin/bash
# SWARM-01 probe 10: bearer auth anywhere? authorizeNamespace impl, mission runtime tenant (read-only)
P=/home/nolan/ping
echo "########## bearer/token auth in gateway+runtime ##########"
grep -rn -i "bearer\|x-api-key\|api_key\|authenticate" $P/gateway/bootstrap/gateway_runtime.js $P/gateway/server.js 2>/dev/null | head -10
echo "--- broader ---"
grep -rln -i "bearer" $P/gateway --include="*.js" 2>/dev/null | grep -v test_ | grep -v node_modules | head -10
grep -rln -i "bearer" $P/ping-runtime --include="*.js" 2>/dev/null | grep -v test_ | grep -v node_modules | head -10
echo "########## authorizeNamespace in canonicalization_service ##########"
grep -n "authorizeNamespace" -A 40 $P/ping-runtime/canonicalization/canonicalization_service.js 2>/dev/null | head -70
echo "########## mission_runtime tenant ##########"
ls $P/ping-runtime/orchestration/ 2>/dev/null
grep -n -i "tenant" $P/ping-runtime/orchestration/mission_runtime.js 2>/dev/null | head -20
echo "########## mission routes tenant ##########"
grep -n -i "tenant" $P/gateway/routes/missions.js 2>/dev/null | head -20
