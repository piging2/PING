#!/bin/bash
# Pig-side retention hygiene (Step 2).
# Cleans ONLY operational transfer buffers that duplicate canonical local evidence:
#   - C:/Users/nolan/.local/share/pigi/fb-engage/meta-answer-*.txt
#   - C:/Users/nolan/.local/share/pigi/fb-engage/meta-fullprompt-*.txt
#   - C:/Users/nolan/.local/share/pigi/fb-engage/inbox/job-*.json(.result.json)
# The authoritative evidence lives in ~/workspace/goals/.../meta-ai-intel/ locally;
# these Pig-side files are transfer buffers after a successful scp pull.
# NOTE: runs.jsonl artifact_refs.pig_answer points at these Pig-side paths as
# transfer locations, not as canonical evidence. After the 7-day sweep those
# refs dangle by design; the evidence chain (ledger -> sidecar -> local
# timestamped raw file) is unaffected. Do not treat pig_answer as durable.
# NEVER touches: fb-profile, node, scripts, node_modules, watchdog log, task XMLs.
#
# Usage: pig-retention.sh [--older-than DAYS] [--apply]
# Default is DRY RUN: lists what would be deleted, deletes nothing.
set -u
DAYS=7
APPLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --older-than) DAYS="${2:?}"; shift 2 ;;
    --apply) APPLY=1; shift ;;
    *) shift ;;
  esac
done
source "$(dirname "$0")/pig-ssh.sh"
PIG_TIMEOUT=10  # retention sweeps are single quick probes; was ConnectTimeout=10
BASE='C:/Users/nolan/.local/share/pigi/fb-engage'
CUTOFF=$(date -d "$DAYS days ago" +%Y-%m-%d)

PS1=$(cat <<EOF
\$cutoff = [datetime]::ParseExact('$CUTOFF','yyyy-MM-dd',\$null)
\$t = @()
\$t += Get-ChildItem '$BASE' -File -Filter 'meta-answer*.txt' -ErrorAction SilentlyContinue
\$t += Get-ChildItem '$BASE' -File -Filter 'meta-fullprompt*.txt' -ErrorAction SilentlyContinue
\$t += Get-ChildItem '$BASE' -File -Filter 'meta-prompt*.txt' -ErrorAction SilentlyContinue
\$t += Get-ChildItem '$BASE/inbox' -File -Filter '*.json*' -ErrorAction SilentlyContinue
\$stale = @(\$t | Where-Object { \$_.LastWriteTime -lt \$cutoff })
if (\$stale.Count -eq 0) { 'RETENTION: 0 stale transfer buffers (cutoff ${DAYS}d)' } else {
  foreach (\$f in \$stale) {
    if ($APPLY -eq 1) { Remove-Item \$f.FullName -Force; 'DELETED: ' + \$f.FullName } else { 'WOULD-DELETE: ' + \$f.FullName }
  }
}
EOF
)

# Single quick probe; ConnectTimeout=10 (via PIG_TIMEOUT above) bounds the SSH
# connection phase. (The old outer `timeout 60` wrapper cannot wrap a shell
# function, and the probe itself is a fast directory listing.)
pig_ssh \
  "powershell -NoProfile -EncodedCommand $(printf '%s' "$PS1" | iconv -t UTF-16LE | base64 -w0)"
