#!/bin/bash
# SWARM-01 probe 18: unifiedEventRuntime query/read filters (read-only)
P=/home/nolan/ping
echo "########## query() namespace/tenant filter ##########"
grep -n "async query" -A 45 $P/ping-runtime/events/unified_event_runtime.js | head -60
