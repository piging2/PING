#!/bin/bash
# swarm-08 probe 15: scheduler getStats, bridges, knowledge queryNodes, heartbeat truth (read-only)
set -u
echo "### mission_scheduler.js getStats def ==="
grep -n "getStats" /home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js | head
echo ""
echo "### find bridge files ==="
timeout 60 find /home/nolan/ping/ping-runtime /home/nolan/ping/gateway -maxdepth 3 -iname '*bridge*' -not -path '*/node_modules/*' 2>/dev/null | grep -v worktrees | head -10
echo ""
echo "### knowledge queryNodes ==="
grep -n "async queryNodes" /home/nolan/ping/ping-runtime/knowledge/knowledge_graph.js
awk '/async queryNodes/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/knowledge/knowledge_graph.js | head -60
