#!/bin/bash
# Wait for the orphaned pass-110 Pig worker (fb-20260924-113702) to finish.
# Polls the Pig inbox for job-20260924-153431.json.result.json every 3 min,
# up to ~150 min. Exits 0 with the result path on stdout when found.
source ~/workspace/pig-fb/pig-ssh.sh
for i in $(seq 1 50); do
  NAME=$(pig_ssh "powershell -NoProfile -Command \"if (Test-Path 'C:/Users/nolan/.local/share/pigi/fb-engage/inbox/job-20260924-153431.json.result.json') { 'FOUND' }\"" 2>/dev/null | tr -d '\r' | grep -o FOUND | head -1)
  if [ "$NAME" = "FOUND" ]; then
    echo "RESULT_READY"
    exit 0
  fi
  sleep 180
done
echo "TIMEOUT_WAITING"
exit 1
