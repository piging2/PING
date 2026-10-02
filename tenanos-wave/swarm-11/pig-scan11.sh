#!/bin/bash
R=/home/nolan/ping
grep -nE "ping_missions|status" "$R/ping-runtime/boundaries/priority_boundary.js" | head -20
echo "=== confirm: no reclaimRetryPending method anywhere ==="
grep -rn "reclaimRetryPending" "$R/ping-runtime" "$R/gateway" --include='*.js' 2>/dev/null | grep -v node_modules | head -5
echo "=== confirm: failWithRetry does not clear lease_until on retry path ==="
sed -n '222,232p' "$R/ping-runtime/orchestration/mission_runtime.js"
