#!/bin/bash
# SWARM-11 scan 4: full read of mission_runtime.js + mission_scheduler.js, plus runs/executions tables.
R=/home/nolan/ping
echo "===== mission_runtime.js (full) ====="
nl -ba "$R/ping-runtime/orchestration/mission_runtime.js" | head -400
echo
echo "===== mission_scheduler.js (full) ====="
nl -ba "$R/ping-runtime/orchestration/mission_scheduler.js" | head -450
echo
echo "===== CREATE TABLE ping_missions / ping_runs / executions ====="
grep -rn "CREATE TABLE" "$R/ping-runtime" "$R/gateway" --include='*.js' 2>/dev/null | grep -iE "mission|run|execut|attempt|task" | head -20
grep -rn "ping_runs\|run_attempts\|mission_runs\|executions\b" "$R/ping-runtime/orchestration/mission_runtime.js" "$R/ping-runtime/orchestration/mission_scheduler.js" 2>/dev/null | head -20
