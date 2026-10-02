#!/bin/bash
# Live gateway port mapping + confirm /ingest is mounted on the running container
docker port ping-gateway 2>/dev/null
echo "== container env (key names only, no values) =="
docker exec ping-gateway sh -c 'env' 2>/dev/null | grep -o "^[A-Z_]*KEY[A-Z_]*\|^GATEWAY[A-Z_]*\|^PORT[A-Z_]*" | sort -u | head -10
echo "== does the running container have the ingest route file? =="
docker exec ping-gateway sh -c 'ls /app/gateway/routes/ingest.js && grep -c "createIngestRoutes" /app/gateway/bootstrap/gateway_runtime.js'
