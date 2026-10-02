#!/bin/bash
# How is /ingest mounted on the live gateway? auth? port? readback route?
G=/home/nolan/ping-gateway-src
grep -n "ingest" "$G/gateway/bootstrap/gateway_runtime.js" | head -10
echo "== exterior auth middleware on ingest? =="
grep -rn "createIngestRoutes\|/ingest" "$G/gateway/bootstrap/gateway_runtime.js" "$G/gateway/routes/" 2>/dev/null | head -10
echo "== what port does the live container listen on =="
docker exec ping-gateway sh -c 'cat /app/gateway/bootstrap/gateway_runtime.js | grep -n "PORT\|listen(" | head -5' 2>/dev/null
echo "== exterior auth: which routes require it =="
grep -n "exteriorAuth\|requireAuth\|authMiddleware" "$G/gateway/bootstrap/gateway_runtime.js" | head -15
