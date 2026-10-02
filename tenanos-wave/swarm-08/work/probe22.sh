#!/bin/bash
# swarm-08 probe 22: compileMissions source + POST /orchestration/missions target (read-only)
set -u
E=/home/nolan/ping/ping-runtime/orchestration/execution/engine.js
echo "### engine.js 95-165 (compileMissions + _missions.push context) ==="
sed -n '95,165p' "$E"
echo ""
echo "### POST /orchestration/missions (lines 39-82) ==="
sed -n '39,82p' /home/nolan/ping/gateway/routes/orchestration.js
