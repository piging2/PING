#!/bin/bash
cd /home/nolan/ping
echo "=== global auth middleware on app? ==="
grep -n "_app.use(" gateway/bootstrap/gateway_runtime.js | head -20
echo "=== artifact_store persistence ==="
grep -nE "require\(|fs\.|writeFile|readFile" ping-runtime/orchestration/execution/artifact_store.js | head -10
echo "=== mission_runtime.js: what it is (head) ==="
sed -n '1,60p' ping-runtime/orchestration/mission_runtime.js
echo "=== mission_scheduler.js: dispatch path (head) ==="
sed -n '1,60p' ping-runtime/orchestration/mission_scheduler.js
