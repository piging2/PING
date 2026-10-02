#!/bin/bash
C=ping-gateway
echo "=== POST /events handler (deployed events.js ~80-140) ==="
docker exec $C sh -c 'sed -n "80,140p" /app/gateway/routes/events.js'
echo "=== auth mentions in events.js ==="
docker exec $C sh -c 'grep -n "requireAuth\|authenticate\|authMiddleware\|requireLevel" /app/gateway/routes/events.js'
echo "=== POST /canonical-events handler head (deployed) ==="
docker exec $C sh -c 'sed -n "15,45p" /app/gateway/routes/canonical_events.js'
echo "=== unified_event_runtime emit: type validation? ==="
docker exec $C sh -c 'grep -n "registry\|isRegistered\|validateEvent\|throw" /app/ping-runtime/events/unified_event_runtime.js 2>/dev/null | head -25 || find /app -name "unified_event_runtime.js" 2>/dev/null | head -3'
echo "=== event_bridge in deployed image? _skipGovernance? ==="
docker exec $C sh -c 'ls /app/ping-runtime/events/event_bridge.js 2>/dev/null; grep -n "_skipGovernance" /app/ping-runtime/events/event_bridge.js 2>/dev/null | head -5; grep -n "REPLAY_COMPLETED\|WITNESS_CREATE" /app/ping-runtime/events/event_to_mission_bridge.js 2>/dev/null | head -8'
echo "=== governance wired in deployed bootstrap? ==="
docker exec $C sh -c 'grep -n "EventGovernance\|eventBridge\|EventBridge" /app/gateway/bootstrap/gateway_runtime.js 2>/dev/null | head -10'
