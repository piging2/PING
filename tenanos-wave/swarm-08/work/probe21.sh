#!/bin/bash
# swarm-08 probe 21: engine _missions population + startAutonomousLoop + orchestration missions source (read-only)
set -u
E=/home/nolan/ping/ping-runtime/orchestration/execution/engine.js
echo "### _missions population ==="
grep -n "_missions\s*=\|_missions.push\|_missions = \|loadMissions\|ping_missions" "$E" | head -15
echo ""
echo "### startAutonomousLoop ==="
awk '/startAutonomousLoop/,/^\s{2}\}/' "$E" | head -50
echo ""
echo "### /orchestration/missions GET source (lines 83-112) ==="
sed -n '83,112p' /home/nolan/ping/gateway/routes/orchestration.js
