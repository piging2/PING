#!/bin/bash
# swarm-08 probe 18: ops/dashboard content, closure-rate hunt, dead letter stats SQL (read-only)
set -u
echo "### /ops/dashboard (lines 81-110) ==="
sed -n '81,110p' /home/nolan/ping/gateway/routes/ops.js
echo ""
echo "### closure rate computations in live repo (bounded) ==="
timeout 90 grep -rn "closureRate\|closure_rate\|missionClosureRate" /home/nolan/ping/gateway /home/nolan/ping/ping-runtime --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -10
echo ""
echo "### dead letter getStats SQL ==="
sed -n '285,320p' /home/nolan/ping/gateway/dead_letter_authority.js
