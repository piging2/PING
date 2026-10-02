#!/bin/bash
# Post one photo + caption to the PING Social Facebook Page via the Pig.
# Usage: run_page_post.sh <local-image.png> <caption-file> <page-url>
# Builds the job JSON, scps the image + job + page-post.js to the Pig
# (C:/Users/nolan/.local/share/pigi/fb-engage/page-inbox/), runs page-post.js
# there via the node portable exe, waits up to 10 min, fetches the result JSON
# and prints it to stdout.
# Exit 0 when a result was retrieved (post success/failure is inside the JSON);
# exit 2 on infra problems (Pig unreachable, CDP down, logged out, timeout).
set -u
IMG="$1"
CAPFILE="$2"
PAGEURL="$3"
TS=$(date +%Y%m%d-%H%M%S)
# Authority gate (2026-10-02, owner-hold authority repair): a schedule is NOT
# authorization. authority-check.py reads CURRENT holds.json first (step 0,
# fail-closed on missing/invalid); an active owner hold denies the dispatch
# with zero external effects.
"$(dirname "$0")/../outreach/authority-check.py" facebook || { echo "run_page_post.sh: authority gate denied; failing closed" >&2; exit 2; }
IMGNAME="page-$(basename "$IMG" | tr -cd 'A-Za-z0-9._-')"
INBOX_WIN='C:/Users/nolan/.local/share/pigi/fb-engage/page-inbox'
ENGAGE_WIN='C:/Users/nolan/.local/share/pigi/fb-engage'
REMOTE_IMG="$INBOX_WIN/$IMGNAME"
REMOTE_JOB="$INBOX_WIN/page-$TS.json"
source "$(dirname "$0")/pig-ssh.sh"  # shared SSH helper; PIG_TIMEOUT default 25
source "$(dirname "$0")/wake-bracket.sh"  # job-scoped wake lease (2026-09-27)

# Pre-flight: headed Chrome/CDP substrate recovery via the existing PigiFBLogin task.
"$(dirname "$0")/ensure-cdp.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }

# Keep the Pig-side worker in sync with this repo copy (small file, always fresh).
pig_scp "$(dirname "$0")/page-post.js" "$PIG:$ENGAGE_WIN/page-post.js" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed_worker"}'; exit 2; }
pig_ssh "powershell -NoProfile -Command \"New-Item -ItemType Directory -Force '$INBOX_WIN' | Out-Null\"" >/dev/null 2>&1

# Build the job locally with the Pig-side image path, then upload both.
JOB_TMP=$(mktemp /tmp/page-job-XXXXXX.json)
python3 - "$JOB_TMP" "$REMOTE_IMG" "$PAGEURL" "$CAPFILE" << 'PYEOF'
import json, sys
_, job_tmp, img, url, capfile = sys.argv
caption = open(capfile, encoding='utf-8').read().strip()
json.dump({"page_url": url, "image_path": img, "caption": caption}, open(job_tmp, 'w', encoding='utf-8'))
PYEOF

pig_scp "$IMG" "$PIG:$REMOTE_IMG" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed_image"}'; exit 2; }
pig_scp "$JOB_TMP" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed_job"}'; exit 2; }
rm -f "$JOB_TMP"

# Owner-hold re-check at the last responsible boundary (2026-10-02, owner-hold
# authority repair): re-read CURRENT holds.json immediately before dispatch. A
# hold that landed after the top gate (stale schedule, queued worker, restart,
# manual trigger) denies here with zero new external effects.
"$(dirname "$0")/../outreach/authority-check.py" facebook || { echo "run_page_post.sh: owner hold re-check denied at pre-launch boundary; failing closed" >&2; exit 2; }

# Job-scoped wake lease (2026-09-27, Nolan): hold ES_CONTINUOUS |
# ES_SYSTEM_REQUIRED for exactly the worker's lifetime. Warn-and-proceed on
# deploy failure; the bracket degrades to today's behavior (no inhibition).
wake_wrap_deploy "run_page_post.sh"

# ONE SSH session launches the Pig job, waits (up to 10 min), and returns the
# worker-written result JSON (or a structured infra failure). Fallback fetch
# covers a dropped session when the worker already finished.
REMOTE_PS=$(cat <<EOF
$(wake_ps_acquire "pagepost-$TS" "FB Page post (page-post.js)")
\$job = '$REMOTE_JOB'
\$res = "\$job.result.json"
Remove-Item \$res -ErrorAction SilentlyContinue
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList 'C:/Users/nolan/.local/share/pigi/fb-engage/page-post.js', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(600000)) {
  if (Test-Path \$res) { Get-Content \$res -Raw }
  else { '{"ok":false,"infra":"result_missing"}' }
} else {
  \$proc.Kill()
  '{"ok":false,"infra":"worker_timeout"}'
}
$(wake_ps_release "pagepost-$TS")
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)
OUT=$(pig_ssh_wake "$REMOTE_B64" 2>/dev/null)
if [ -z "$OUT" ]; then
  # NOTE: strip CR bytes; PowerShell emits CRLF.
  OUT=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path '$REMOTE_JOB.result.json') { Get-Content '$REMOTE_JOB.result.json' -Raw }\"" 2>/dev/null | tr -d '\r')
fi
if [ -n "$OUT" ]; then
  echo "$OUT"
  # Retention hygiene: sweep Pig-side transfer buffers older than 7d. Never fails the run.
  "$(dirname "$0")/pig-retention.sh" --apply >/dev/null 2>&1 || true
  exit 0
fi
echo '{"ok":false,"infra":"result_unavailable"}'
exit 2
