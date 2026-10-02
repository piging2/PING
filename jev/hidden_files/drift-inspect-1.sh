#!/bin/bash
# Read-only deployment inspection: routes, registry, workers (ping-gateway container)
C=ping-gateway
echo "=== route files ==="
docker exec $C ls /app/gateway/routes/ 2>&1
echo "=== POST routes (file:line) ==="
docker exec $C sh -c 'grep -rn "app.post\|\.post(" /app/gateway/routes/ 2>/dev/null | head -40'
echo "=== auth middleware mentions on POST routes ==="
docker exec $C sh -c 'grep -rln "requireAuth\|authenticate\|authMiddleware\|verifyToken\|bearer" /app/gateway/routes/ 2>/dev/null'
echo "=== registry event count ==="
docker exec $C sh -c 'node -e "const r=require(\"/app/gateway/generated/event_registry.json\");console.log(\"keys:\",Object.keys(r.events||r).length)"' 2>&1
echo "=== verdict types in deployed registry ==="
docker exec $C sh -c 'node -e "const r=require(\"/app/gateway/generated/event_registry.json\");const e=r.events||r;[\"REPLAY_COMPLETED\",\"WITNESS_CREATED\",\"WITNESS_REJECTED\",\"LINEAGE_CREATED\",\"JEV_DECISION_EVALUATED\"].forEach(t=>console.log(t, e[t]?\"REGISTERED\":\"absent\"))"' 2>&1
echo "=== worker registrations (deployed canonical_workers.js) ==="
docker exec $C sh -c 'grep -n "eventTypes:" /app/ping-runtime/workers/canonical_workers.js 2>/dev/null | head -20'
echo "=== witness gate (deployed) ==="
docker exec $C sh -c 'grep -n "verified ===" /app/ping-runtime/workers/canonical_workers.js 2>/dev/null | head -5'
echo "=== P2/P3/P4 presence in deployed image ==="
docker exec $C sh -c 'ls /app/ping-runtime/jev/ 2>/dev/null; grep -c "ACCEPT_CLAIM" /app/ping-runtime/jev/typed_decision.js 2>/dev/null; grep -n "JEV_DECISION_EVALUATED" /app/gateway/generated/event_generator.js 2>/dev/null | head -3'
