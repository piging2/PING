#!/bin/bash
# swarm-08 probe 20: engine.js mission counters source + who serves dashboard.js/engine getReport (read-only)
set -u
echo "### engine.js mission counters (400-470) ==="
sed -n '400,470p' /home/nolan/ping/ping-runtime/orchestration/execution/engine.js | grep -n "totalMissions\|mergedMissions\|failedMissions\|pendingMissions\|_missions\|getReport\|startAutonomousLoop" | head -20
echo ""
echo "### who calls getReport / uses orchestration dashboard ==="
timeout 90 grep -rln "orchestration/dashboard\|execution/engine" /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v test_ | head -10
echo ""
echo "### /orchestration routes in routes/orchestration.js ==="
grep -n "router.get\|router.post" /home/nolan/ping/gateway/routes/orchestration.js | head -30
