#!/bin/bash
# SWARM-01 probe 17: identities routes, events read path, event->mission bridge (read-only)
P=/home/nolan/ping
echo "########## routes/identities.js ##########"
grep -n "router\.\|tenant\|namespace" $P/gateway/routes/identities.js | head -25
echo "########## routes/events.js tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/routes/events.js | head -25
echo "########## event_to_mission_bridge tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/orchestration/event_to_mission_bridge.js | head -30
echo "########## mission_scheduler 220-240 ##########"
sed -n 220,240p $P/ping-runtime/orchestration/mission_scheduler.js
