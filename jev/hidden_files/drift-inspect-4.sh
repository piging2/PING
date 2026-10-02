#!/bin/bash
C=ping-gateway
echo "=== event_validator.js: registry loading + isRegistered ==="
docker exec $C sh -c 'sed -n "1,60p" /app/ping-runtime/events/event_validator.js; echo "---- isRegistered ----"; sed -n "115,140p" /app/ping-runtime/events/event_validator.js'
echo "=== which registry files exist in image ==="
docker exec $C sh -c 'find /app -name "event_registry.json" 2>/dev/null; echo ---; grep -rn "REPLAY_COMPLETED" /app/gateway/generated/event_registry.json | head -2; echo "count keys via node again:"; node -e "1" 2>/dev/null'
echo "=== exterior auth middleware: enforcement mode ==="
docker exec $C sh -c 'sed -n "1,80p" /app/gateway/exterior_auth_middleware.js'
