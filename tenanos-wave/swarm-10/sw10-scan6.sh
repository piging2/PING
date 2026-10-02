#!/bin/bash
# SWARM-10 scan 6: subscribers of escalation-relevant events; pending-approval
# surfacing; capability route denials; background worker failure paths. Read-only.
R=/home/nolan/ping
echo "===== K1: subscribers of mission_rejected / consensus_failed / merge_decision_created ====="
grep -rEn "subscribe\(['\"](mission_rejected|consensus_failed|merge_decision_created|mission_accepted)" "$R/gateway" "$R/ping-runtime" 2>/dev/null | grep -v node_modules | head -20
echo "===== K2: getPendingApprovals / approveManually callers ====="
grep -rEn 'getPendingApprovals|approveManually|\.reject\(' "$R/gateway" 2>/dev/null | grep -v node_modules | grep -v 'approval_authority.js' | head -20
echo "===== K3: approval routes ====="
grep -rEn 'approval' "$R/gateway/bootstrap" "$R/gateway/routes" 2>/dev/null | grep -v node_modules | head -20
echo "===== K4: capabilities route - denial paths ====="
ls "$R/gateway/routes/" | head -40
echo "===== K5: background_workers failure handling ====="
grep -n 'catch\|fail\|error\|retry\|escalat' "$R/gateway/background_workers.js" 2>/dev/null | head -30
echo "===== K6: exterior auth denials ====="
grep -n 'deny\|denied\|401\|403\|reject' "$R/gateway/exterior_auth_middleware.js" 2>/dev/null | head -20
