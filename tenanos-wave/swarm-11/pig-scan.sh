#!/bin/bash
# READ-ONLY scan of /home/nolan/projects/ping for run/task/attempt state machines.
REPO=/home/nolan/projects/ping
cd "$REPO" || exit 1

echo "=== 1. State enum / status literals (run|task|attempt|mission|execution|job|worker) ==="
grep -rhoE "(status|state)[\"']?\s*[:=]\s*[\"'][A-Za-z_]+" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' src scripts lib 2>/dev/null | sort | uniq -c | sort -rn | head -40

echo "=== 2. Distinct status literal values ==="
grep -rhoE "['\"](PENDING|RUNNING|SUCCEEDED|FAILED|BLOCKED|CANCELLED|UNKNOWN_EXECUTION|NEEDS_RECONCILIATION|QUEUED|IN_PROGRESS|COMPLETED|CANCELED|TIMED_OUT|TIMEOUT|STALE|ORPHANED|ABANDONED|RETRYING|LEASED|CLAIMED|ASSIGNED|STARTED|FINISHED|SUCCESS|FAILURE|ERROR|INTERRUPTED|EXPIRED)['\"]" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' src scripts lib 2>/dev/null | sort | uniq -c | sort -rn | head -60

echo "=== 3. Files mentioning run state / run status ==="
grep -rliE "run_state|runStatus|run-status|runstate|attempt_state|task_state|mission_state|execution_state" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' src scripts lib 2>/dev/null | head -30

echo "=== 4. Lease / heartbeat / reconciliation / orphan mentions ==="
grep -rliE "lease|heartbeat|reconcile|orphan|resum" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' src scripts lib 2>/dev/null | head -30

echo "=== 5. Dirs that look like runtime/engine/orchestrator/mission/worker ==="
find . -maxdepth 3 -type d -not -path './node_modules*' -not -path './.git*' \( -iname '*mission*' -o -iname '*worker*' -o -iname '*runtime*' -o -iname '*orchestr*' -o -iname '*scheduler*' -o -iname '*executor*' -o -iname '*engine*' -o -iname '*tenant*' -o -iname '*mcp*' \) 2>/dev/null | head -30

echo "=== 6. DB / migration files mentioning runs ==="
find . -maxdepth 4 -not -path './node_modules*' -not -path './.git*' \( -iname '*migration*' -o -iname '*schema*' -o -iname '*prisma*' \) -type f 2>/dev/null | head -20
grep -rliE "create table.*run|runs\s*\(" --include='*.sql' . 2>/dev/null | grep -v node_modules | head -10
