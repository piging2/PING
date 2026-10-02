#!/bin/bash
# th_discover.sh -- READ-ONLY Threads discovery on the Pig ig-profile Chrome.
# Usage: th_discover.sh <local-job.json>
# Scps th-discover.js + job to the Pig, runs it (read-only: no likes/comments/
# reposts/follows/DMs), scps the result JSON back. Exit 0 with result printed;
# exit 2 on infra problems (Pig unreachable, CDP down, logged out).
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
INBOX="C:/Users/nolan/.local/share/pigi/ig-engage"
REMOTE_JS="$INBOX/th-discover.js"
REMOTE_JOB="$INBOX/inbox/th-discover-job-$TS.json"
REMOTE_RES="$REMOTE_JOB.result.json"
source "$(dirname "$0")/pig-ssh.sh"

pig_scp "$(dirname "$0")/th-discover.js" "$PIG:$REMOTE_JS" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_script_failed"}'; exit 2; }
"$(dirname "$0")/ensure-cdp-ig.sh" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"cdp_down_after_relaunch"}'; exit 2; }
python3 -c "import json,sys; p=sys.argv[1]; j=json.load(open(p)); j['resultFile']=sys.argv[2]+'.result.json'; json.dump(j,open(p,'w'))" "$JOB" "$REMOTE_JOB"
pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

REMOTE_PS=$(cat <<EOF
\$job = '$REMOTE_JOB'
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList '$REMOTE_JS', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(3600000)) { 'DISCOVER_DONE exit=' + \$proc.ExitCode }
else { \$proc.Kill(); 'DISCOVER_TIMEOUT' }
EOF
)
OUT=$(pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)" 2>/dev/null)
if ! printf '%s' "$OUT" | grep -q 'DISCOVER_DONE'; then
  echo '{"ok":false,"infra":"discover_failed_or_timeout","detail":"'"$(printf '%s' "$OUT" | tr -d '\r\n' | cut -c1-120)"'"}'
  exit 2
fi
LOCAL_RES="${JOB%.json}.result.json"
pig_scp "$PIG:$REMOTE_RES" "$LOCAL_RES" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_result_failed"}'; exit 2; }
cat "$LOCAL_RES"
