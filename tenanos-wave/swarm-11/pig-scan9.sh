#!/bin/bash
R=/home/nolan/ping
echo "===== temporal workflow + activities states ====="
grep -nE "status|state" "$R/ping-runtime/temporal/workflows/mission_workflow.js" 2>/dev/null | head -20
grep -nE "status|state" "$R/ping-runtime/temporal/activities/mission_activities.js" 2>/dev/null | head -20
ls "$R/ping-runtime/temporal/workflows" "$R/ping-runtime/temporal/activities" 2>/dev/null
echo
echo "===== 'blocked' anywhere in runtime/gateway ====="
grep -rn "['\"]blocked['\"]\|BLOCKED" "$R/ping-runtime" "$R/gateway" --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -10
echo
echo "===== 'cancel' anywhere ====="
grep -rn "['\"]cancel" "$R/ping-runtime/orchestration/mission_runtime.js" "$R/ping-runtime/orchestration/mission_scheduler.js" "$R/gateway/mission_execution_authority.js" 2>/dev/null | head -10
echo
echo "===== bootstrap lines 540-620 (scheduler wiring) ====="
sed -n '540,620p' "$R/gateway/bootstrap/gateway_runtime.js"
