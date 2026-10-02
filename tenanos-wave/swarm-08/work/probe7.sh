#!/bin/bash
# swarm-08 probe 7: extract getStats/getActive/getPending/getTrace/query implementations (read-only)
set -u
MR=/home/nolan/ping/ping-runtime/orchestration/mission_runtime.js
UR=/home/nolan/ping/ping-runtime/events/unified_event_runtime.js
WR=/home/nolan/ping/ping-runtime/workers/worker_runtime.js
MS=/home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js
echo "### mission_runtime.js size + function list ==="
wc -l "$MR"
grep -n "async getStats\|async getActive\|async getPending\|async getTrace\|getStats(\|getActive(\|getPending(\|getTrace(" "$MR" | head -20
echo "### getStats body ==="
awk '/async getStats\(\)/,/^\s{2}\}/' "$MR" | head -80
