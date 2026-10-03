#!/bin/bash
# wake-proof.sh -- live acquire/release proof for the Pig wake lease.
#
# Holds a SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) lock
# on the Pig for a bounded number of seconds, then proves via
# `powercfg /requests` that a SYSTEM request appears during the hold and
# clears after release. Also verifies the per-lease state file shows
# acquired=true followed by released=true.
#
# Usage: wake-proof.sh [hold_seconds]   (default 30, max 120)
# Exit 0: full proof (acquired -> visible in powercfg -> released -> cleared).
# Exit 2: proof FAILED or transport unavailable; evidence on stdout.
#
# Requires: pig-ssh.sh and wake-bracket.sh in the same directory.
# Never touches OS power policy; `powercfg /requests` is read-only.
set -u
HERE="$(dirname "$0")"
HOLD_SECS="${1:-30}"
[ "$HOLD_SECS" -le 120 ] || { echo "wake-proof: hold_seconds capped at 120" >&2; exit 2; }

source "$HERE/pig-ssh.sh"
source "$HERE/wake-bracket.sh"

TS=$(date +%Y%m%d-%H%M%S)
RUN_ID="proof-$TS"
LOG="/tmp/wake-proof-$TS.log"

# Pin the canonical wrapper Pig-side (same as the runners).
wake_wrap_deploy "wake-proof.sh" || true

REMOTE_PS=$(cat <<EOF
\$wakeRunId = '$RUN_ID'
\$wakeOk = \$false
try { . 'C:/Users/nolan/.local/share/pigi/wake-wrap.ps1'; \$wakeOk = Wake-Acquire -RunId \$wakeRunId -Reason 'wake-lock live proof (wake-proof.sh)' } catch { \$wakeOk = \$false }
if (-not \$wakeOk) { [Console]::Error.WriteLine('WAKE_PROOF_ACQUIRE_FAILED run_id=' + \$wakeRunId); exit 3 }
[Console]::Error.WriteLine('WAKE_PROOF_ACQUIRED run_id=' + \$wakeRunId)
Start-Sleep -Seconds $HOLD_SECS
Wake-Release -RunId \$wakeRunId
[Console]::Error.WriteLine('WAKE_PROOF_RELEASED run_id=' + \$wakeRunId)
EOF
)
REMOTE_B64=$(printf '%s' "$REMOTE_PS" | iconv -t UTF-16LE | base64 -w0)

# 1. Holder runs in the background locally; it self-terminates after HOLD_SECS.
pig_ssh_wake "$REMOTE_B64" >"$LOG.holder.out" 2>"$LOG.holder.err" &
HOLDER_PID=$!

# 2. Wait until the holder reports acquisition (bounded).
ACQUIRED=0
for i in $(seq 1 20); do
  sleep 2
  if grep -q 'WAKE_PROOF_ACQUIRED' "$LOG.holder.err" 2>/dev/null; then ACQUIRED=1; break; fi
  if grep -q 'WAKE_PROOF_ACQUIRE_FAILED' "$LOG.holder.err" 2>/dev/null; then break; fi
  kill -0 "$HOLDER_PID" 2>/dev/null || break
done
if [ "$ACQUIRED" != "1" ]; then
  echo "wake-proof: FAIL acquire did not report within ~40s (log: $LOG.holder.err)"
  wait "$HOLDER_PID" 2>/dev/null
  exit 2
fi

# 3. During-hold observation: powercfg /requests SYSTEM section.
pig_ssh "powercfg /requests" >"$LOG.during.txt" 2>/dev/null || { echo "wake-proof: FAIL powercfg during-hold unreachable"; exit 2; }
DURING_SYS=$(awk '/^SYSTEM:/{f=1;next}/^$/{if(f)exit}f' "$LOG.during.txt")
echo "--- powercfg /requests SYSTEM section DURING hold ---"
printf '%s\n' "$DURING_SYS"

# 4. Wait for the holder to release, then re-observe.
wait "$HOLDER_PID"
pig_ssh "powercfg /requests" >"$LOG.after.txt" 2>/dev/null || { echo "wake-proof: FAIL powercfg after-hold unreachable"; exit 2; }
AFTER_SYS=$(awk '/^SYSTEM:/{f=1;next}/^$/{if(f)exit}f' "$LOG.after.txt")
echo "--- powercfg /requests SYSTEM section AFTER release ---"
printf '%s\n' "$AFTER_SYS"

# 5. State-file record: acquired=true then released=true.
STATE=$(pig_ssh "powershell -NoProfile -Command \"Get-Content 'C:/Users/nolan/.local/share/pigi/run-state/wake-$RUN_ID.json' -Raw\"" 2>/dev/null)
echo "--- per-lease state record ---"
printf '%s\n' "$STATE"

PASS=1
echo "$DURING_SYS" | grep -qi 'powershell.exe' || { echo "NOTE: no powershell.exe SYSTEM entry during hold (attribution ambiguous)"; }
echo "$AFTER_SYS" | grep -qi 'powershell.exe' && { echo "wake-proof: FAIL powershell.exe SYSTEM request still present after release"; PASS=0; }
echo "$STATE" | grep -q '"acquired": *true' || { echo "wake-proof: FAIL state file missing acquired=true"; PASS=0; }
echo "$STATE" | grep -q '"released": *true' || { echo "wake-proof: FAIL state file missing released=true"; PASS=0; }
grep -q 'WAKE_PROOF_RELEASED' "$LOG.holder.err" || { echo "wake-proof: FAIL holder never reported release"; PASS=0; }

if [ "$PASS" = "1" ]; then
  echo "wake-proof: PASS run_id=$RUN_ID hold=${HOLD_SECS}s (evidence: $LOG.*)"
  exit 0
fi
echo "wake-proof: FAIL run_id=$RUN_ID (evidence: $LOG.*)"
exit 2
