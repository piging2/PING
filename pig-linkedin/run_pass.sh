#!/bin/bash
# Run one LinkedIn engagement pass on the Pig.
# Phase 1 scope: likes and comments only (see linkedin-automation-plan doc).
# Usage: run_pass.sh <local-job.json>
# Copies the job to the Pig, runs li-engage/engage.js there via CDP :9224,
# waits for the result file, prints the result JSON to stdout.
# Exit 0 on completed pass (even with failed actions); exit 2 on infra
# problems (Pig unreachable, CDP down, logged out, or BLOCKED signal).
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-10-02, owner-hold authority repair): a schedule is NOT
# authorization. authority-check.py reads CURRENT holds.json first (step 0,
# fail-closed on missing/invalid); an active owner hold denies the dispatch
# with zero external effects.
"$(dirname "$0")/../outreach/authority-check.py" linkedin || { echo "run_pass.sh (linkedin): authority gate denied; failing closed" >&2; exit 2; }
REMOTE="C:/Users/nolan/.local/share/pigi/li-engage/inbox/job-$TS.json"
source "$(dirname "$0")/../pig-fb/pig-ssh.sh"  # shared SSH helper
PIG_NODE="C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe"
PIG_WORKER="C:/Users/nolan/.local/share/pigi/li-engage/engage.js"

# Pre-flight: LinkedIn headed Chrome/CDP substrate on :9224.
"$(dirname "$0")/ensure-cdp-li.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down"}'; exit 2; }

pig_scp "$JOB" "$PIG:$REMOTE" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

# Owner-hold re-check at the last responsible boundary (2026-10-02, owner-hold
# authority repair): re-read CURRENT holds.json immediately before dispatch. A
# hold that landed after the top gate (stale schedule, queued worker, restart,
# manual trigger) denies here with zero new external effects.
"$(dirname "$0")/../outreach/authority-check.py" linkedin || { echo "run_pass.sh (linkedin): owner hold re-check denied at pre-launch boundary; failing closed" >&2; exit 2; }

REMOTE_PS=$(cat <<EOF
\$job = '$REMOTE'
\$res = "\$job.result.json"
\$env:NODE_PATH = 'C:/Users/nolan/.local/share/pigi/fb-engage/node_modules'
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath '$PIG_NODE' -ArgumentList '$PIG_WORKER', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(10800000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
EOF
)
OUT=$(pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)" 2>/dev/null)
if [ -z "$OUT" ]; then
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE.result.json') { Get-Content '$REMOTE.result.json' -Raw }\"" 2>/dev/null)
fi
if [ -n "$OUT" ]; then
  echo "$OUT"
  exit 0
fi
echo '{"ok":false,"infra":"result_unavailable"}'
exit 2
