#!/bin/bash
# SWARM-10 scan 13: final line-number pinning for inventory citations.
R=/home/nolan/ping
echo "===== engine.js decision points ====="
grep -n 'No workers available\|_resolveMission\|mission_rejected\|consensus_failed\|merge_decision_created\|mission_accepted\|canCommit' "$R/ping-runtime/orchestration/execution/engine.js" | head -20
echo "===== node_registry approve/commit ====="
grep -n 'class ApproveNodeExecutor\|class CommitNodeExecutor\|approval_status\|Not approved' "$R/gateway/node_registry.js" | head -10
echo "===== merge_queue stages/review ====="
grep -n 'constitutional_review\|completeReview\|reviews_required\|can_commit' "$R/ping-runtime/orchestration/merge_queue.js" | head -12
echo "===== mission_scheduler fail/deadletter ====="
grep -n '_failMission\|recordDeadLetter\|no worker matched\|max_attempts' "$R/ping-runtime/orchestration/mission_scheduler.js" | head -12
echo "===== mission_runtime fail/retry ====="
grep -n 'async fail\|async failWithRetry\|retry_pending\|reclaimRetryPending\|Exhausted' "$R/ping-runtime/orchestration/mission_runtime.js" | head -14
echo "===== knowledge promoter ====="
grep -n 'class KnowledgePromoter\|async handle\|APPROVE_EVENTS = \|REJECT_EVENTS = ' "$R/ping-runtime/knowledge/knowledge_promoter.js" | head -8
