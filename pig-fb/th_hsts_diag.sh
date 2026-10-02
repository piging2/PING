#!/bin/bash
# th_hsts_diag.sh -- READ-ONLY Threads HSTS diagnostics on the Pig.
# Usage: th_hsts_diag.sh <local-job.json>
# Scps th-hsts-diag.js + job to the Pig, runs it (read-only: navigates only,
# reads extension manifests from disk, never clicks, never clears storage),
# scps the result JSON back. Exit 0 with result printed; exit 2 on infra problems.
set -u
JOB="$1"
TS=$(date +%Y%m%d-%H%M%S)
INBOX="C:/Users/nolan/.local/share/pigi/ig-engage"
REMOTE_JS="$INBOX/th-hsts-diag.js"
REMOTE_JOB="$INBOX/inbox/th-hstsdiag-job-$TS.json"
REMOTE_RES="$REMOTE_JOB.result.json"
source "$(dirname "$0")/pig-ssh.sh"

pig_scp "$(dirname "$0")/th-hsts-diag.js" "$PIG:$REMOTE_JS" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_script_failed"}'; exit 2; }
python3 -c "import json,sys; p=sys.argv[1]; j=json.load(open(p)); j['resultFile']=sys.argv[2]+'.result.json'; json.dump(j,open(p,'w'))" "$JOB" "$REMOTE_JOB"
pig_scp "$JOB" "$PIG:$REMOTE_JOB" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_failed"}'; exit 2; }

REMOTE_PS=$(cat <<EOF
\$job = '$REMOTE_JOB'
\$proc = Start-Process -FilePath 'C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe' -ArgumentList '$REMOTE_JS', \$job -NoNewWindow -PassThru
if (\$proc.WaitForExit(900000)) { 'DIAG_DONE exit=' + \$proc.ExitCode }
else { \$proc.Kill(); 'DIAG_TIMEOUT' }
EOF
)
OUT=$(pig_ssh "powershell -NoProfile -EncodedCommand $(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)" 2>/dev/null)
if ! printf '%s' "$OUT" | grep -q 'DIAG_DONE'; then
  echo '{"ok":false,"infra":"diag_failed_or_timeout","detail":"'"$(printf '%s' "$OUT" | tr -d '\r\n' | cut -c1-120)"'"}'
  exit 2
fi
LOCAL_RES="${JOB%.json}.result.json"
pig_scp "$PIG:$REMOTE_RES" "$LOCAL_RES" >/dev/null 2>&1 || { echo '{"ok":false,"infra":"scp_result_failed"}'; exit 2; }
cat "$LOCAL_RES"
