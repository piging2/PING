#!/bin/bash
R=/home/nolan/ping
echo "===== all SET status/execution_status/approval_status transitions ====="
grep -rnE "SET (status|execution_status|approval_status|run_status|state) *= *'" "$R/gateway" "$R/ping-runtime" --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -60
echo
echo "===== mission_events statuses ====="
grep -nE "status" "$R/gateway/mission_event_bus.js" | head -20
echo
echo "===== bounded work / budget / deadline / attempt mentions ====="
grep -rnliE "budget|deadline|max_attempts|attempts" "$R/ping-runtime/orchestration" "$R/ping-runtime/workers" "$R/ping-runtime/execution" 2>/dev/null | head -15
echo
echo "===== ORCA engine files ====="
find "$R" -maxdepth 2 -iname '*orca*' 2>/dev/null | head; ls "$R" | head -30
