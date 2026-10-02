#!/bin/bash
# SWARM-10 scan 9: knowledge promoter; SNIPPET_APPROVED emitters; mission runtime
# stuck/failed handling; capability execution decision now. Read-only.
R=/home/nolan/ping
echo "===== P1: who emits SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED ====="
grep -rEn 'SNIPPET_APPROVED|AI_RESPONSE_ACCEPTED' "$R/gateway" "$R/ping-runtime" --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | grep -v 'test_' | head -25
echo "===== P2: knowledge_promoter handle() head ====="
sed -n '1,90p' "$R/ping-runtime/knowledge/knowledge_promoter.js"
echo "===== P3: mission_runtime stuck/failed/escalate ====="
grep -n 'fail\|stuck\|escalat\|retry\|dead\|block' "$R/ping-runtime/orchestration/mission_runtime.js" | head -30
echo "===== P4: mission_scheduler stuck/failed ====="
grep -n 'fail\|stuck\|escalat\|retry\|dead\|block\|human\|approv' "$R/ping-runtime/orchestration/mission_scheduler.js" | head -30
