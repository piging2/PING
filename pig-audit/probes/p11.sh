#!/bin/bash
cd /home/nolan/ping
echo "=== ExecutionEngine / orchestration wiring lines ==="
grep -n "ExecutionEngine\|createOrchestrationRoutes\|/orchestration\|initialize(" gateway/bootstrap/gateway_runtime.js | head -20
echo "=== auth middleware mentions ==="
grep -n "Bearer\|bearer\|authMiddleware\|authenticate\|exterior_agent\|requireAuth" gateway/bootstrap/gateway_runtime.js | head -20
echo "=== listen/port ==="
grep -n "listen\|PORT" gateway/bootstrap/gateway_runtime.js | head -10
