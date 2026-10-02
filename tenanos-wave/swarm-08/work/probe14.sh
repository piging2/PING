#!/bin/bash
# swarm-08 probe 14: getStats implementations across worker/scheduler/bridges/knowledge/deadletter (read-only)
set -u
echo "### worker_runtime getStats ==="
awk '/getStats\(\)/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/workers/worker_runtime.js | head -40
echo ""
echo "### mission_scheduler getStats ==="
awk '/getStats\(\)/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js | head -40
echo ""
echo "### bridges getStats ==="
timeout 30 grep -rn "getStats" /home/nolan/ping/ping-runtime/bridges/*.js 2>/dev/null | head -10
ls /home/nolan/ping/ping-runtime/bridges/ 2>/dev/null | head
echo ""
echo "### knowledgeGraph queryNodes ==="
timeout 60 find /home/nolan/ping/ping-runtime -name '*knowledge*' -not -path '*/node_modules/*' 2>/dev/null | head -5
