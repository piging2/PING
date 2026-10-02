#!/bin/bash
# fb-worker-probe.sh -- is a Pig-side fb-profile worker already driving the
# headed Chrome (:9223)? (2026-09-24, orphan model: the old inline probe in
# run_pass.sh was fail-OPEN on a silent SSH failure and only matched
# engage.js, blind to fb-unfollow.js and meta-ask.js on the same profile.)
#
# Matches ANY node process whose command line drives the fb profile:
# engage.js (engagement pass), fb-unfollow.js (unfollow batch), meta-ask.js
# (Meta AI research). The browser is shared; two drivers at once can wedge
# or disturb each other's CDP pages, so a dispatch must never launch while
# one is in flight.
#
# Exit 0: probe succeeded, no worker in flight (safe to dispatch).
# Exit 1: a worker IS in flight; its PID is printed to stdout.
# Exit 2: probe FAILED (Pig unreachable, query error) -> UNKNOWN. Callers
#         must treat this as "unknown, do not launch", never as "clear".
#
# set -u safe. PIG_SSH_LIB may point at a stub for tests.
set -u
source "${PIG_SSH_LIB:-$(dirname "$0")/pig-ssh.sh}"

OUT=$(pig_ssh "powershell -NoProfile -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='node.exe'\\\" | Where-Object { (\$_.CommandLine -like '*fb-engage/engage.js*') -or (\$_.CommandLine -like '*fb-engage/fb-unfollow.js*') -or (\$_.CommandLine -like '*meta-ask.js*') } | Select-Object -ExpandProperty ProcessId -First 1\"" 2>/dev/null)
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "fb-worker-probe: Pig probe failed (ssh exit $RC); worker state UNKNOWN" >&2
  exit 2
fi
PID=$(printf '%s' "$OUT" | tr -d '\r' | head -1 | tr -d '[:space:]')
if [ -n "$PID" ]; then
  echo "$PID"
  exit 1
fi
exit 0
