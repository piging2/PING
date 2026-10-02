#!/bin/bash
# SWARM-11: extract run/task/attempt state machines (read-only).
R=/home/nolan/ping
echo "## FILES: orchestration dir"
ls "$R/ping-runtime/orchestration/" | head -40
echo
echo "## MISSION_RUNTIME states"
grep -nE "status|state" "$R/ping-runtime/orchestration/mission_runtime.js" | grep -iE "pending|running|succeed|success|fail|cancel|block|stuck|orphan|lease|claim|assign|expire|timeout|stale|retry" | head -40
echo
echo "## SCHEDULER states"
grep -nE "status|state" "$R/ping-runtime/orchestration/mission_scheduler.js" | grep -iE "pending|running|succeed|success|fail|cancel|block|stuck|orphan|lease|claim|assign|expire|timeout|stale|retry|dispatch" | head -40
echo
echo "## WORKER_RUNTIME states"
grep -nE "status|state" "$R/ping-runtime/workers/worker_runtime.js" | grep -iE "pending|running|succeed|success|fail|cancel|block|stuck|orphan|lease|claim|assign|expire|timeout|stale|retry|dispatch|heartbeat" | head -40
