#!/bin/bash
# SWARM-10 scan 10: dead letter authority + consumers; API emitters of approval
# events; mission generator decision points. Read-only.
R=/home/nolan/ping
echo "===== Q1: dead letter authority ====="
find "$R/gateway" "$R/ping-runtime" -iname '*dead*letter*' 2>/dev/null | grep -v node_modules | head
echo "--- consumers of recordDeadLetter / dead letter reads ---"
grep -rEn 'recordDeadLetter|getDeadLetters|dead_letter' "$R/gateway" "$R/ping-runtime" --include='*.js' 2>/dev/null | grep -v node_modules | grep -v __tests__ | head -20
echo "===== Q2: API routes emitting SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED ====="
grep -rEn "emit\(['\"]?(SNIPPET_APPROVED|AI_RESPONSE_ACCEPTED|SNIPPET_REJECTED|AI_RESPONSE_REJECTED)" "$R/gateway" --include='*.js' 2>/dev/null | grep -v node_modules | head -10
echo "--- any route with approv in name ---"
grep -rln 'snippet.*approv\|approv.*snippet' "$R/gateway/routes" 2>/dev/null | head
echo "===== Q3: mission generator - decision/escalation lines ====="
grep -n 'human\|approv\|escalat\|fail\|stuck\|dead\|manual\|review' "$R/gateway/automatic_mission_generator.js" | head -25
