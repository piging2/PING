#!/bin/bash
# Nolan-approved X follow batch, 2026-09-15: entrepreneur doubling-down.
# Usage: x-follow-batch.sh [queue-file]
#   queue-file defaults to x-follow-queue.txt (one handle per line).
#   Passes build a per-pass queue (guard-filtered fresh targets) and pass it.
# Pacing: 8-15 min jittered between follows. Halts on restriction signal (exit 3).
# Logs to the brand-launch hidden log; the caller appends results to the ledger.
# Exit codes: 2 = usage/authority/queue error, 3 = restriction halt,
#   4 = aborted: discovery probe still in flight (probe-before-follow rule).
# Probe-before-follow (2026-09-29, interval 08 timeout hardening): the batch
# never starts while the read-only discovery probe is in flight. Pass
# x-20260929-1723 started this batch under a running probe; the probe stalled
# its full 3120s bound on the shared X Chrome and the comment/like leg
# fail-closed with zero candidates.
source "$(dirname "$0")/pig-ssh.sh"
QUEUE="${1:-$(dirname "$0")/x-follow-queue.txt}"
LOG=~/workspace/goals/ping-social-brand-launch/hidden_files/x-follow-batch-2026-09-15.log
# Test seam for the probe-completion wait below (seconds).
X_FOLLOW_PROBE_WAIT_SECS="${X_FOLLOW_PROBE_WAIT_SECS:-600}"
ts() { date -u +"%Y-%m-%d %H:%M:%S UTC"; }
log() { echo "- $(ts): $1" | tee -a "$LOG"; }
# Authority gate (2026-09-29, Nolan 90h GO): a schedule is NOT authorization.
# authority-check.py consumes AUTHORITY.json, platform tripwires, and recent
# pass logs; a nonzero exit halts with zero external effects (fail closed).
if ! "$(dirname "$0")/../outreach/authority-check.py" x; then log "AUTHORITY-GATE fail-closed: no external action"; exit 2; fi
[ -f "$QUEUE" ] || { log "HALT: queue file missing: $QUEUE"; exit 2; }
# Probe-before-follow: wait bounded for an in-flight discovery probe to finish
# (declared dependency: probe completion). The probe is read-only and holds no
# lock; it is detected by its Pig-side node process (x-discover-run.js), the
# same WMI pattern the wrapper's own backstop sweep uses. An unreachable Pig
# reads as no-probe (fail-open: today's behavior). If the probe is still in
# flight after the bound, abort the batch (exit 4, fail closed) rather than
# start a write batch under a running probe.
probe_active() {
  PIG_TIMEOUT=60 pig_ssh 'powershell -NoProfile -Command "if (Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { $_.CommandLine -like ''*x-discover-run.js*'' }) { ''ACTIVE'' } else { ''IDLE'' }"' < /dev/null 2>&1 | tr -d '\r\n ' | grep -q ACTIVE
}
waited=0
while probe_active && [ "$waited" -lt "$X_FOLLOW_PROBE_WAIT_SECS" ]; do
  sleep 30; waited=$((waited+30))
done
if probe_active; then
  log "ABORT: discovery probe (x-discover-run.js) still in flight after ${X_FOLLOW_PROBE_WAIT_SECS}s; not starting follow batch under a running probe"
  exit 4
fi
log "batch start"
first=1
while IFS= read -r h || [ -n "$h" ]; do
  h="${h%%[[:space:]]*}"; [ -z "$h" ] && continue
  case "$h" in \#*) continue;; esac
  if [ $first -eq 0 ]; then
    wait=$((480 + RANDOM % 421))
    log "pacing: sleeping ${wait}s before @$h"
    sleep $wait
  fi
  first=0
  # NOTE: </dev/null is load-bearing. pig_ssh wraps ssh, which reads stdin;
  # without it ssh swallows the rest of the queue file and the loop ends early.
  out=$(PIG_TIMEOUT=150 pig_ssh "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/x-follow-run.ps1 $h" < /dev/null 2>&1)
  rc=$?
  line=$(printf '%s' "$out" | tail -1)
  log "@$h -> rc=$rc :: $line"
  if [ $rc -eq 3 ]; then
    log "HALT: restriction signal on @$h; stopping batch per red-line rule"
    exit 3
  fi
done < "$QUEUE"
log "batch complete"
