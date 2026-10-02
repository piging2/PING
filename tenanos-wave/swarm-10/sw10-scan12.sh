#!/bin/bash
# SWARM-10 scan 12: dead letter replay/requeue; approval-event emitters in
# projects/ping; mission_execution_graph approve/commit sections line numbers.
R=/home/nolan/ping
echo "===== S1: dead_letter_authority methods ====="
grep -n 'async \|replay\|requeue\|redrive' "$R/gateway/dead_letter_authority.js" | head -25
echo "===== S2: approval event emitters in /home/nolan/projects/ping ====="
grep -rln 'SNIPPET_APPROVED|AI_RESPONSE_ACCEPTED' /home/nolan/projects/ping/src 2>/dev/null | head -10
echo "===== S3: mission_execution_graph approve/commit line numbers ====="
grep -n 'requestApproval\|approval_status\|_executeApprove\|_executeCommit\|Not approved' "$R/gateway/mission_execution_graph.js" | head -20
echo "===== S4: approval_authority manual/constitutional policy line numbers ====="
grep -n 'pending_manual\|pending_constitutional\|approveManually\|getPendingApprovals\|Default to automatic' "$R/gateway/approval_authority.js" | head -12
