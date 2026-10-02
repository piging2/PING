#!/bin/bash
# pigwsl-wakelock.sh — run-scoped Windows wake lock for Pig automation.
#
# Keeps the Pig's normal system sleep behavior. While the wrapped command
# runs, a tagged PowerShell holder on the Pig calls SetThreadExecutionState(
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED ), which surfaces as a SYSTEM power
# request (visible via `powercfg /requests`). The lock is released by
# killing the tagged holder. Release runs in traps on EXIT/INT/TERM, so a
# workload that crashes (nonzero exit) still releases the lock.
#
# Usage:
#   pigwsl-wakelock.sh -- command [args...]   # run command under the lock
#   pigwsl-wakelock.sh status                 # show holders + power requests
#   pigwsl-wakelock.sh sweep                  # kill holders older than 12h
#
# The wrapper exits with the wrapped command's status. If the lock cannot
# be acquired (verified via powercfg), the command is NOT run (fail closed).
# This never changes system-wide sleep policy; it only inhibits sleep for
# the duration of one run.

set -u

PIGRUN="$HOME/workspace/pig/pigwsl-run.sh"
TAG_PREFIX="PIG-RUN-WAKELOCK"
ACQUIRE_TIMEOUT_S=30
SWEEP_MAX_AGE_S=43200   # 12h
HOLDER_SLEEP_S=86400

TAG=""
HOLDER_SSH_PID=""
HOLDER_LOG=""
RELEASED=0

bridge() { "$PIGRUN" "$1" < /dev/null 2>&1; }

build_holder_script() {
  # $1 = tag. Emits the bridge script text. The tag is a trailing PowerShell
  # comment so it appears in the holder's command line for pkill matching.
  # NOTE: inner double quotes are backslash-escaped for the Pig-side bash.
  cat <<EOF
powershell.exe -NoProfile -NonInteractive -Command "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class WL { [DllImport(\\"kernel32.dll\\")] public static extern uint SetThreadExecutionState(uint f); }'; [void][WL]::SetThreadExecutionState(2147483649); Start-Sleep -Seconds ${HOLDER_SLEEP_S} # $1" < /dev/null
EOF
}

holder_alive() {
  # $1 = tag. True when the tagged holder process exists on the Pig.
  [ -n "$(bridge "pgrep -f '$1' 2>/dev/null")" ]
}

lock_visible() {
  # True when powercfg shows an active SYSTEM request from powershell.exe.
  bridge 'powercfg.exe /requests < /dev/null' | grep -q 'powershell.exe'
}

release() {
  [ "$RELEASED" = 1 ] && return 0
  RELEASED=1
  if [ -n "$TAG" ]; then
    bridge "pkill -f '$TAG' 2>/dev/null; true" >/dev/null 2>&1
  fi
  if [ -n "$HOLDER_SSH_PID" ]; then
    kill "$HOLDER_SSH_PID" 2>/dev/null
    wait "$HOLDER_SSH_PID" 2>/dev/null
  fi
  return 0
}

acquire() {
  TAG="$TAG_PREFIX-$(date +%s)-$$"
  HOLDER_LOG="/tmp/pig-wakelock-$TAG.log"
  local script
  script="$(build_holder_script "$TAG")"
  "$PIGRUN" "$script" < /dev/null >"$HOLDER_LOG" 2>&1 &
  HOLDER_SSH_PID=$!
  local waited=0
  while [ "$waited" -lt "$ACQUIRE_TIMEOUT_S" ]; do
    if holder_alive "$TAG" && lock_visible; then
      echo "wake lock acquired (tag $TAG)" >&2
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "ERROR: wake lock not visible after ${ACQUIRE_TIMEOUT_S}s; workload NOT started (fail closed)" >&2
  echo "holder log: $HOLDER_LOG" >&2
  release
  return 1
}

do_status() {
  echo "--- holders ---"
  bridge "pgrep -af '$TAG_PREFIX' 2>/dev/null; true"
  echo "--- powercfg /requests ---"
  bridge 'powercfg.exe /requests < /dev/null'
}

do_sweep() {
  bridge '
now=$(date +%s)
for pid in $(pgrep -f "PIG-RUN-WAKELOCK-" 2>/dev/null); do
  cmd=$(tr "\0" " " < /proc/$pid/cmdline 2>/dev/null)
  epoch=$(printf "%s" "$cmd" | grep -o "PIG-RUN-WAKELOCK-[0-9]*" | head -1 | sed "s/.*-//")
  if [ -n "$epoch" ] && [ $((now - epoch)) -gt '"$SWEEP_MAX_AGE_S"' ]; then
    echo "sweeping stale holder pid $pid (age $((now - epoch))s)"
    kill "$pid" 2>/dev/null
  fi
done
echo sweep-done' < /dev/null
}

case "${1:-}" in
  status) do_status; exit 0 ;;
  sweep)  do_sweep;  exit 0 ;;
  --)     shift ;;
  *) echo "usage: $0 -- command [args...] | status | sweep" >&2; exit 2 ;;
esac
[ $# -eq 0 ] && { echo "usage: $0 -- command [args...]" >&2; exit 2; }

trap release EXIT
trap 'release; exit 130' INT
trap 'release; exit 143' TERM

acquire || exit 1
"$@"
rc=$?
exit "$rc"
