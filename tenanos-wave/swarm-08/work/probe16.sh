#!/bin/bash
# swarm-08 probe 16: scheduler/bridge getStats, dead letter authority, replay provider (read-only)
set -u
echo "### scheduler getStats (line 331) ==="
sed -n '325,345p' /home/nolan/ping/ping-runtime/orchestration/mission_scheduler.js
echo ""
echo "### event_bridge getStats ==="
grep -n "getStats" /home/nolan/ping/ping-runtime/events/event_bridge.js | head -3
awk '/getStats\(\)/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/events/event_bridge.js | head -25
echo ""
echo "### event_to_mission_bridge getStats ==="
grep -n "getStats" /home/nolan/ping/ping-runtime/orchestration/event_to_mission_bridge.js | head -3
awk '/getStats\(\)/,/^\s{2}\}/' /home/nolan/ping/ping-runtime/orchestration/event_to_mission_bridge.js | head -25
echo ""
echo "### find dead letter authority ==="
timeout 60 find /home/nolan/ping -name '*dead*letter*' -not -path '*/node_modules/*' 2>/dev/null | grep -v worktrees | head -8
