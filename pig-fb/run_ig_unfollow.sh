#!/bin/bash
# Run one Instagram unfollow batch on the Pig.
# Usage: run_ig_unfollow.sh <local-job.json>
# Copies ig-unfollow.js (current) + the job to the Pig, runs the worker there,
# waits for the result file, prints the result JSON to stdout.
# Exit 0 on worker completion (even with failed actions); exit 2 on infra problems.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-10-02, owner-hold authority repair): a schedule is NOT
# authorization. authority-check.py reads CURRENT holds.json first (step 0,
# fail-closed on missing/invalid); an active owner hold denies the dispatch
# with zero external effects.
"$(dirname "$0")/../outreach/authority-check.py" instagram || { echo "run_ig_unfollow.sh: authority gate denied; failing closed" >&2; exit 2; }
REMOTE_DIR='C:/Users/nolan/.local/share/pigi/ig-engage'
REMOTE_JOB="$REMOTE_DIR/inbox/job-igunfollow-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

# Browser mutual-exclusion (2026-09-21, FL-20260921-015): the ig-profile
# Chrome (:9226) is shared with the IG/Threads engagement passes. Hold the
# profile lock for this run's lifetime; if another worker holds it, fail
# closed before any browser work.
source "$(dirname "$0")/browser-lock.sh"
browser_lock_acquire ig "run_ig_unfollow.sh" || exit 2

# Capability gate (2026-09-17, automation-resilience program): check the IG
# capability state FIRST, before any CDP probe or browser work. When BLOCKED
# (e.g. BROWSER_WEDGE), exit quietly with classification DEPENDENCY_FAILURE
# instead of firing browser tasks into a wedged browser. Never attempt to
# restart, kill, or relaunch the Pig's ig-profile Chrome.
source "$(dirname "$0")/ig-capability-gate.sh"
ig_capability_check || exit 2

# Canary mode: after a browser recovery the capability state carries
# canary_required=true; the Pig worker then executes exactly ONE canary
# unfollow, verifies the button flip, and only continues the batch on success.
if [ "$(ig_canary_flag)" = "1" ]; then IG_CANARY_REQUIRED=1; fi
export IG_CANARY_REQUIRED="${IG_CANARY_REQUIRED:-}"

# Keep the Pig-side worker current.
pig_scp "$(dirname "$0")/ig-unfollow.js" "$PIG:$REMOTE_DIR/ig-unfollow.js" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"worker_scp_failed"}'; exit 2; }

"$(dirname "$0")/ensure-cdp-ig.sh" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || {
  echo '{"ok":false,"infra":"job_scp_failed"}'; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_ig_unfollow.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "igunfollow-$TS" "IG unfollow batch (ig-unfollow.js)")
\$env:CANARY_REQUIRED = '${IG_CANARY_REQUIRED:-}'
\$job = '$REMOTE_JOB'
\$res = "\$job.result.json"
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList 'C:/Users/nolan/.local/share/pigi/ig-engage/ig-unfollow.js', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(10800000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
$(wake_ps_release "igunfollow-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if [ -z "$OUT" ]; then
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE_JOB.result.json') { Get-Content '$REMOTE_JOB.result.json' -Raw }\"" 2>/dev/null)
fi
if [ -n "$OUT" ]; then
  # Strip the worker's one-line RESULT summary; stdout stays pure result JSON.
  OUT=$(printf '%s' "$OUT" | sed '1{/^RESULT /d;}')
  echo "$OUT"
  # A verified canary clears the post-recovery canary requirement.
  if [ "${IG_CANARY_REQUIRED:-}" = "1" ] && printf '%s' "$OUT" | grep -q '"canary_verified"[[:space:]]*:[[:space:]]*true'; then
    ig_canary_clear >/dev/null 2>&1 || true
  fi
  "$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
  exit 0
fi
echo '{"ok":false,"infra":"result_unavailable"}'
exit 2
