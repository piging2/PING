#!/bin/bash
# run_ig_observe_post.sh -- READ-ONLY one-post observation on the Pig ig-profile Chrome.
# Usage: run_ig_observe_post.sh <local-job.json>
# Dispatches ig-observe-post.js to the Pig (read-only: no likes/comments/follows/DMs),
# scps the result JSON back next to the job file as <job>.result.json.
# Exit 0 with result printed; exit 2 on infra problems (Pig unreachable, CDP down,
# logged out). Exit 4 if the IG session is logged out (no login attempt, no credential entry).
set -u
JOB="$1"
PIGFB="$(dirname "$0")"
INBOX="C:/Users/nolan/.local/share/pigi/ig-engage"
REMOTE_JS="$INBOX/ig-observe-post.js"
TS=$(date +%Y%m%d-%H%M%S)
REMOTE_JOB="$INBOX/inbox/observe-job-$TS.json"
REMOTE_RES="$REMOTE_JOB.result.json"
source "$PIGFB/pig-ssh.sh"
source "$PIGFB/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)
source "$PIGFB/browser-lock.sh"

browser_lock_acquire ig "ig-observe-post-$TS" || { echo '{"ok":false,"infra":"lock_failed"}'; exit 2; }
pig_scp "$PIGFB/ig-observe-post.js" "$PIG:$REMOTE_JS" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_script_failed"}'; exit 2; }
"$PIGFB/ensure-cdp-ig.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }
python3 -c "import json,sys; p=sys.argv[1]; j=json.load(open(p)); j['resultFile']=sys.argv[2]; json.dump(j,open(p,'w'))" "$JOB" "$REMOTE_RES"
pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_ig_observe_post.sh"

REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "igobserve-$TS" "IG one-post observation (ig-observe-post.js, read-only)")
\$job = '$REMOTE_JOB'
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList '$REMOTE_JS', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(300000)) { 'OBSERVE_DONE exit=' + \$proc.ExitCode }
else { \$proc.Kill(); 'OBSERVE_TIMEOUT' }
$(wake_ps_release "igobserve-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if ! printf '%s' "$OUT" | grep -q 'OBSERVE_DONE'; then
  echo '{"ok":false,"infra":"observe_failed_or_timeout","detail":"'"$(printf '%s' "$OUT" | tr -d '\r\n' | cut -c1-120)"'"}'
  exit 2
fi
LOCAL_RES="${JOB%.json}.result.json"
pig_scp "$PIG:$REMOTE_RES" "$LOCAL_RES" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_result_failed"}'; exit 2; }
cat "$LOCAL_RES"
