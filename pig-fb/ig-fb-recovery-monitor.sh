#!/bin/bash
# ig-fb-recovery-monitor.sh -- recover from FL-20260921-014 (Pig SSH outage).
# Waits for SSH to return, then checks the IG (ig-20260921-125500) and FB
# (fb-20260921-132059) pool-expansion workers and pulls their result files.
# READ-ONLY: never relaunches workers, never writes intents.
set -u
SSH_KEY=/home/hatch/.ssh/id_ed25519
KH=/home/hatch/workspace/pig/known_hosts
PROXY='nc -X connect -x hatch-egress-proxy:3130 %h %p'
PIG='muse-ssh@100.79.154.43'
qssh() { timeout 30 ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=15 \
  -o UserKnownHostsFile="$KH" -o "ProxyCommand=$PROXY" "$PIG" "$@" 2>/dev/null; }
qscp() { timeout 60 scp -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=20 \
  -o UserKnownHostsFile="$KH" -o "ProxyCommand=$PROXY" "$@" 2>/dev/null; }

echo "[$(date -u +%FT%TZ)] recovery monitor started (FL-20260921-014)"
for i in $(seq 1 36); do
  if [ "$(qssh 'echo UP' | tr -d '\r\n')" = "UP" ]; then
    echo "[$(date -u +%FT%TZ)] SSH recovered after $i checks"
    break
  fi
  sleep 300
done
if [ "$(qssh 'echo UP' | tr -d '\r\n')" != "UP" ]; then
  echo "[$(date -u +%FT%TZ)] SSH still down after 3h; giving up"
  exit 1
fi
echo "--- IG worker (job-20260921-131656) ---"
qssh "powershell -NoProfile -Command \"if (Get-CimInstance Win32_Process -Filter 'ProcessId=19968' -ErrorAction SilentlyContinue) { 'IG_WORKER_ALIVE' } else { 'IG_WORKER_GONE' }; if (Test-Path 'C:/Users/nolan/.local/share/pigi/ig-engage/inbox/job-20260921-131656.json.result.json') { 'IG_RESULT_EXISTS' } else { 'IG_RESULT_MISSING' }\""
IGDIR=/home/hatch/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes
qscp "$PIG:C:/Users/nolan/.local/share/pigi/ig-engage/inbox/job-20260921-131656.json.result.json" \
  "$IGDIR/ig-driver-result-20260921-125500.json" && echo "IG result pulled" || echo "IG result pull FAILED"
echo "--- FB worker (pool-seeds) ---"
qssh "powershell -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='node.exe'\\\" | Where-Object { \$_.CommandLine -like '*engage.js*' } | ForEach-Object { \$_.ProcessId }\""
echo "[$(date -u +%FT%TZ)] monitor done"
