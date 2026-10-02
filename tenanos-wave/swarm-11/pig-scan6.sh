#!/bin/bash
R=/home/nolan/ping
echo "===== state_machine_executor.js states ====="
grep -nE "['\"](pending|running|completed|succeeded|success|failed|failure|cancelled|cancelled_by|canceled|blocked|stale|orphan|unknown|timeout|timed_out|expired|retrying|retry_pending|paused|held)['\"]" "$R/ping-runtime/runtime/state_machine_executor.js" | head -30
echo
echo "===== state_machine_executor.js transitions ====="
grep -nE "transition|allowed|next" "$R/ping-runtime/runtime/state_machine_executor.js" | head -40
echo
echo "===== worker_runtime.js key states/dispatch ====="
grep -nE "status|stale|heartbeat|dispatch" "$R/ping-runtime/workers/worker_runtime.js" | head -50
echo
echo "===== temporal/index.js states ====="
grep -nE "['\"](pending|running|completed|failed|cancelled|blocked|stale|unknown)['\"]" "$R/ping-runtime/temporal/index.js" 2>/dev/null | head -20
