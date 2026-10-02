#!/bin/bash
# SWARM-10 scan 7: gateway_runtime human-approval context; capabilities route mount;
# background_workers + exterior_auth existence; mission routes content. Read-only.
R=/home/nolan/ping
echo "===== M1: gateway_runtime.js around line 586 ====="
sed -n '560,620p' "$R/gateway/bootstrap/gateway_runtime.js"
echo "===== M2: where are capabilities routes mounted ====="
grep -rn "routes/capabilities\|require.*capabilities.*routes\|/capabilities" "$R/gateway/bootstrap/gateway_runtime.js" 2>/dev/null | head -10
echo "===== M3: file existence ====="
ls -la "$R/gateway/background_workers.js" "$R/gateway/exterior_auth_middleware.js" "$R/gateway/routes/capabilities.js" 2>&1
echo "===== M4: missions route (first 80 lines) ====="
head -80 "$R/gateway/routes/missions.js"
