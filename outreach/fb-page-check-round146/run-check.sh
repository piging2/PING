#!/bin/bash
# Round 146: Pig-side READ-ONLY FB Page Message-button check pass (6 targets).
# Holds the local fb browser lock for the whole run so no other worker touches :9223.
# File transfer uses pig_scp direct to the Windows OpenSSH server (C:/ paths);
# scp via pigwsl:/home/nolan is a black hole (exit 0, file lands nowhere).
# The node run itself goes through pigwsl-exec (WSL side), synchronous, session held open.
# Usage: run-check.sh   (runs in foreground; launch via background exec)
set -u
PIGFB=/home/hatch/workspace/pig-fb
CHECKDIR=/home/hatch/workspace/outreach/fb-page-check-round146
WIN_DIR='C:/Users/nolan/fb-page-check'
WSL_DIR='/mnt/c/Users/nolan/fb-page-check'

source "$PIGFB/browser-lock.sh"
source "$PIGFB/pig-ssh.sh"
browser_lock_acquire fb "round146-page-check" || exit 2
echo "LOCK_HELD fb"

# Worker probe: never launch while a Pig-side fb driver is in flight.
"$PIGFB/fb-worker-probe.sh"
PRC=$?
if [ "$PRC" -ne 0 ]; then
  echo "WORKER_PROBE_BLOCKED rc=$PRC; aborting"
  exit 3
fi
echo "PROBE_CLEAR"

# Transfer check script + targets to the Pig (Windows side).
pig_scp "$CHECKDIR/message-button-check.js" "$PIG:$WIN_DIR/message-button-check.js" || { echo "SCP_FAILED js"; exit 4; }
pig_scp "$CHECKDIR/targets.json" "$PIG:$WIN_DIR/targets.json" || { echo "SCP_FAILED targets"; exit 4; }
echo "SCP_OK"

# Verify both files landed before running.
pig_ssh 'powershell -NoProfile -Command "((Test-Path C:/Users/nolan/fb-page-check/message-button-check.js) -and (Test-Path C:/Users/nolan/fb-page-check/targets.json))"' | grep -q True || { echo "STAGE_VERIFY_FAILED"; exit 5; }
echo "STAGED"

# Run the read-only check with the Pig's portable Windows node against :9223 (synchronous).
# NOTE: node.exe is a Windows binary; it takes Windows-form paths (C:/...), not /mnt/c/... paths.
"$PIGFB/pigwsl-exec.sh" -s << PIGEOF || { echo "CHECK_FAILED"; exit 6; }
set -u
/mnt/c/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe "$WIN_DIR/message-button-check.js" "$WIN_DIR/targets.json"
PIGEOF
RC=$?
echo "CHECK_DONE rc=$RC"

# Copy the full results JSON back locally.
pig_scp "$PIG:$WIN_DIR/results-round146.json" "$CHECKDIR/results-round146.json" 2>/dev/null || echo "NO_RESULTS_FILE"
ls -la "$CHECKDIR/results-round146.json" 2>/dev/null || echo "NO_RESULTS_FILE"
exit $RC
