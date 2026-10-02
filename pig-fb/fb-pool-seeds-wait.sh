#!/bin/bash
# fb-pool-seeds-wait.sh -- wait for pass 84 (PID 18412) to finish, then run the
# pool-seeds FB engagement pass. Never launches while 18412 is alive.
set -u
PIGSSH="$HOME/workspace/pig-fb/pig-ssh.sh"
source "$PIGSSH"
echo "[$(date -u +%FT%TZ)] watcher started; waiting for PID 18412"
for i in $(seq 1 240); do
  ALIVE=$(pig_ssh "powershell -NoProfile -Command \"if (Get-CimInstance Win32_Process -Filter 'ProcessId=18412' -ErrorAction SilentlyContinue) { 'ALIVE' } else { 'GONE' }\"" 2>/dev/null | tr -d '\r\n')
  if [ "$ALIVE" = "GONE" ]; then
    echo "[$(date -u +%FT%TZ)] pass 84 (PID 18412) ended after $i checks; launching pool-seeds pass"
    break
  fi
  sleep 60
done
if [ "$ALIVE" != "GONE" ]; then
  echo "[$(date -u +%FT%TZ)] TIMEOUT: PID 18412 still alive after 4h; not launching"
  exit 1
fi
exec "$HOME/workspace/pig-fb/run_pass.sh" "$HOME/workspace/outreach/fb-job-20260921-pool-seeds.json"
