#!/bin/bash
# swarm-08 probe 28: attempts / capability decisions / checkpoints / memory surfaces (read-only)
set -u
echo "### attempts table? ==="
timeout 60 grep -rln "CREATE TABLE.*attempt" /home/nolan/ping/ping-runtime /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -5
echo "### capability decision records ==="
timeout 60 grep -rln "capability_decision\|capability_grant\|grant_decision" /home/nolan/ping/ping-runtime /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -8
echo "### checkpoint concept ==="
timeout 60 grep -rln "CREATE TABLE.*checkpoint\|checkpoint_id" /home/nolan/ping/ping-runtime /home/nolan/ping/gateway --include='*.js' 2>/dev/null | grep -v node_modules | grep -v dormant | head -8
echo "### memory getSummary backing ==="
timeout 60 grep -rn "getSummary" /home/nolan/ping/ping-runtime/memory/*.js 2>/dev/null | head -5
ls /home/nolan/ping/ping-runtime/memory/ 2>/dev/null | head
echo "### replay provider getStats ==="
timeout 60 grep -rn "getStats\|_engineVersion" /home/nolan/ping/ping-runtime/agents/replay_worker.js 2>/dev/null | head -8
