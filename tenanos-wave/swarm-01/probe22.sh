#!/bin/bash
# SWARM-01 probe 22: exact line numbers for diff anchors (read-only)
P=/home/nolan/ping
echo "=== event_bridge emit ==="
grep -n "const emitResult" $P/ping-runtime/events/event_bridge.js
grep -n "_skipGovernance" $P/ping-runtime/events/event_bridge.js
echo "=== route_middleware asyncHandler lines ==="
grep -n "function asyncHandler\|console.log\|body: req.body\|query: req.query" $P/gateway/route_middleware.js
echo "=== canonicalization_service resolveNamespace lines ==="
grep -n "resolveNamespace(source, requested) {" $P/ping-runtime/canonicalization/canonicalization_service.js
echo "=== mission_control missions/active handler ==="
sed -n 381,400p $P/gateway/routes/mission_control.js
