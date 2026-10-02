#!/bin/bash
C=ping-gateway
echo "=== mount layer for /events and /canonical-events (deployed) ==="
docker exec $C sh -c 'grep -n "canonical-events\|\"/events\"\|./events\|authenticatedAgent\|exteriorAuth\|authMiddleware" /app/gateway/bootstrap/gateway_runtime.js | head -20'
echo "=== where does authenticatedAgent come from ==="
docker exec $C sh -c 'grep -rn "authenticatedAgent" /app/gateway/*.js /app/gateway/bootstrap/*.js /app/gateway/middleware/*.js 2>/dev/null | head -10'
echo "=== unified_event_runtime emit lines 75-125 (validation failure behavior) ==="
docker exec $C sh -c 'sed -n "75,125p" /app/ping-runtime/events/unified_event_runtime.js'
echo "=== validator: validateEventType / isRegistered behavior ==="
docker exec $C sh -c 'grep -rn "validateEventType\|isRegistered" /app/ping-runtime/events/event_validator.js 2>/dev/null | head; find /app -name "event_validator*.js" 2>/dev/null | head -3'
