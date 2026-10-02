#!/bin/bash
# sprint-wakelock-release.sh — release the sprint-scoped wake lock.
# Run at sprint end via: ~/workspace/pig/pigwsl-run.sh "$(cat ~/workspace/pig/sprint-wakelock-release.sh)"
set -u
pkill -f "pig-sprint-wakelock.ps1" 2>/dev/null; true
sleep 2
echo "--- remaining holders ---"
pgrep -af "pig-sprint-wakelock.ps1" || echo "none (released)"
echo "--- powercfg /requests ---"
powercfg.exe /requests < /dev/null | grep -i -c "powershell.exe" | xargs -I{} echo "powershell SYSTEM requests: {}"
