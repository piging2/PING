#!/bin/bash
# Run one Facebook unfollow batch on the Pig.
# Usage: run_unfollow.sh <local-job.json>
# Copies fb-unfollow.js (current) + the job to the Pig, runs the worker there,
# waits for the result file, prints the result JSON to stdout.
# Exit 0 on worker completion (even with failed actions); exit 2 on infra problems.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
REMOTE_DIR='C:/Users/nolan/.local/share/pigi/fb-engage'
REMOTE_JOB="$REMOTE_DIR/inbox/job-unfollow-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"

# Browser mutual-exclusion (2026-09-21, FL-20260921-016): the fb-profile
# Chrome (:9223) is shared with the FB engagement passes and Meta AI.
# Hold the profile lock for this run's lifetime; if another worker holds it,
# fail closed before any browser work.
source "$(dirname "$0")/browser-lock.sh"
browser_lock_acquire fb "run_unfollow.sh" || exit 2

# Keep the Pig-side worker current, including its local module deps
# (2026-09-17: fb-unfollow.js requires ./pass-classifier and
# ./enumeration-verify; deploying without them made node exit at startup
# with no result file -> result_missing).
for dep in fb-unfollow.js pass-classifier.js enumeration-verify.js; do
  pig_scp "$(dirname "$0")/$dep" "$PIG:$REMOTE_DIR/$dep" >/dev/null 2>&1 || {
    echo '{"ok":false,"infra":"worker_scp_failed"}'; exit 2; }
done

"$(dirname "$0")/ensure-cdp.sh" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"job_scp_failed"}'; exit 2; }
pig_scp "$(dirname "$0")/wake-wrap.ps1" "$PIG:C:/Users/nolan/.local/share/pigi/wake-wrap.ps1" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"wake_wrap_scp_failed"}'; exit 2; }

# Launch the worker DETACHED and poll for the result file. The worker MUST
# survive this SSH session dropping. Start-Process -NoNewWindow does NOT
# survive: OpenSSH for Windows places session processes in a Job Object with
# KILL_ON_JOB_CLOSE, and Start-Process children inherit that job, so the
# worker is killed ~1-2 min after this SSH session exits (2026-09-25: the
# morning unfollow batch died exactly this way when the cron worker's run
# ended early, leaving no result file and unrecorded unfollows). WMI
# Win32_Process.Create spawns outside the SSH session's job object, so the
# worker survives (proven pattern from run_pass.sh, 2026-09-24). The local
# poll loop below only waits; if it is killed, the detached worker still
# finishes and writes the result file for later collection.
REMOTE_PS=$(cat <<EOF
\$job = '$REMOTE_JOB'
Remove-Item (\$job + '.result.json') -ErrorAction SilentlyContinue
\$node = 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe'
\$w = 'C:/Users/nolan/.local/share/pigi/fb-engage/fb-unfollow.js'
# Scoped wake inhibition (2026-09-25, Nolan): the worker runs as a CHILD of
# wake-wrap.ps1, which holds SetThreadExecutionState(ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED) for exactly the worker lifetime. Worker exit/crash ->
# wrapper WaitForExit returns -> release. Wrapper killed -> kernel thread
# teardown releases it. No OS power-policy change, ever.
\$wrap = 'C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'
\$psbin = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
\$runId = 'unfollow-$TS'
\$ret = ([wmiclass]'Win32_Process').Create("\$psbin -NoProfile -ExecutionPolicy Bypass -File \$wrap -RunId \$runId -Reason \`"FB unfollow batch\`" -WorkerExe \$node -WorkerArgsCsv \$w,\$job -MaxWaitMinutes 120")
if (\$ret.ReturnValue -ne 0) { Write-Error ("WMI Create failed rc=" + \$ret.ReturnValue); exit 1 }
"FBWORKERPID=\$(\$ret.ProcessId)"
EOF
)
# PID parse (2026-09-24: PowerShell may wrap stdout in CLIXML, so the remote
# script emits a tagged FBWORKERPID=<n> line; grep extracts it regardless).
WORKER_PID=$(pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)" 2>/dev/null | tr -d '\r' | grep -oE 'FBWORKERPID=[0-9]+' | head -1 | cut -d= -f2)
if ! printf '%s' "$WORKER_PID" | grep -qE '^[0-9]+$'; then
  echo '{"ok":false,"infra":"worker_launch_failed"}'
  exit 2
fi

# Wait for the result file via local polling (a killed waiter never kills the
# detached batch). Bound: 100 x 30s = 50 min; on timeout report worker_timeout
# and exit 2 WITHOUT touching the worker — its result file stays collectable.
OUT=""
for _ in $(seq 1 100); do
  sleep 30
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE_JOB.result.json') { Get-Content '$REMOTE_JOB.result.json' -Raw }\"" 2>/dev/null | tr -d '\r')
  if [ -n "$OUT" ]; then break; fi
done
if [ -n "$OUT" ]; then
  # Strip the worker's one-line RESULT summary; stdout stays pure result JSON.
  OUT=$(printf '%s' "$OUT" | sed '1{/^RESULT /d;}')
  echo "$OUT"
  "$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
  exit 0
fi
echo '{"ok":false,"infra":"worker_timeout"}'
exit 2
