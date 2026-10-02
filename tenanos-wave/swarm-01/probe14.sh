#!/bin/bash
# SWARM-01 probe 14: objects, capability resolver, tool gateway, bg workers, mc routes, event bridge (read-only)
P=/home/nolan/ping
echo "########## ping_objects.sql tenant ##########"
grep -n -i "tenant" $P/database/ping_objects.sql | head -10
echo "########## capability_resolver tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/runtime/capability_resolver.js | head -20
echo "########## tool_gateway.js tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/tool_gateway.js | head -30
echo "########## background_workers.js tenant ##########"
grep -n -i "tenant\|namespace" $P/gateway/background_workers.js | head -20
echo "########## routes/mission_control.js endpoints ##########"
grep -n "router\.\|async (" $P/gateway/routes/mission_control.js | head -40
echo "########## event_bridge tenant ##########"
grep -n -i "tenant\|namespace" $P/ping-runtime/events/event_bridge.js | head -20
echo "########## unified_event_runtime tenant ##########"
grep -n -i "tenant" $P/ping-runtime/events/unified_event_runtime.js | head -20
