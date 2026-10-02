#!/bin/bash
cd /home/nolan/ping
echo "=== route mounts (780-810) ==="
sed -n '780,810p' gateway/bootstrap/gateway_runtime.js
echo "=== how ingest enforces Bearer (routes/ingest.js) ==="
grep -n -i -B2 -A8 "authorization" gateway/routes/ingest.js | head -40
echo "=== auth middleware module? ==="
grep -rn "module.exports" gateway/auth*.js 2>/dev/null | head; ls gateway/ | grep -i auth
