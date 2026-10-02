#!/bin/bash
R=/home/nolan/ping
echo "===== execution_repository.js ====="
nl -ba "$R/gateway/repositories/execution_repository.js" | head -140
echo
echo "===== temporal/index.js head ====="
nl -ba "$R/ping-runtime/temporal/index.js" | head -80
echo
echo "===== bootstrap: mission_runtime init / scheduler start / reconciliation scan ====="
grep -nE "MissionRuntime|MissionScheduler|reapExpired|getPending|reconcile|startup|START" "$R/gateway/bootstrap/gateway_runtime.js" | head -30
