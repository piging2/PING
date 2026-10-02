#!/bin/bash
cd /home/nolan/ping
echo "=== worker_runtime.js: OS execution primitives ==="
grep -nE "child_process|spawn|execFile|execSync|fork|python|Docker|docker" ping-runtime/workers/worker_runtime.js | head -20
echo "=== worker_runtime.js dispatch function ==="
grep -n "async dispatch\|dispatch(" ping-runtime/workers/worker_runtime.js | head
echo "=== where is auth middleware applied? ==="
grep -rn "Bearer\|bearerAuth\|requireAuth\|auth(" gateway/bootstrap/main.js gateway/bootstrap/index.js 2>/dev/null | head -10
echo "=== auth in routes/missions.js ==="
grep -n "Bearer\|auth" gateway/routes/missions.js | head -10
