#!/bin/bash
cd /home/nolan/ping
echo "=== orchestration mount ==="
grep -n "createOrchestrationRoutes\|executionEngine" gateway/bootstrap/gateway_runtime.js | head
echo "=== lines 330-360 ==="
sed -n '330,360p' gateway/bootstrap/gateway_runtime.js
echo "=== auth in route_middleware.js ==="
sed -n '1,120p' gateway/route_middleware.js
