#!/bin/bash
cd /home/nolan/ping
echo "=== worker_runtime.js dispatch (lines 40-160) ==="
cat -n ping-runtime/workers/worker_runtime.js | sed -n '40,160p'
echo "=== Bearer auth anywhere in gateway bootstrap ==="
grep -rn "Bearer" gateway/bootstrap/ | head -5
echo "=== main.js head ==="
sed -n '1,60p' gateway/bootstrap/main.js
