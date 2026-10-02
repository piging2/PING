#!/bin/bash
# swarm-08 probe 8: getActive/getPending/getTrace + schema of ping_missions/ping_events (read-only)
set -u
MR=/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js
echo "### lines 185-412 ==="
sed -n '185,412p' "$MR"
