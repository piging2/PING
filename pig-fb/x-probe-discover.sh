#!/bin/bash
# x-probe-discover.sh: durable launcher for the X read-only discovery probe.
#
# DO NOT hand-roll the probe bridge invocation. The probe MUST run Windows-side:
#   - WSL (sandbox AND Pig WSL) cannot reach the 127.0.0.1-bound CDP :9225
#     (ECONNREFUSED verified from both; Pig-WSL curl to 127.0.0.1:9225 -> rc=7).
#     pigwsl-run.sh is therefore NOT a valid probe transport; the 2026-09-22
#     ~01:14 pass died on exactly this mistake (shell syntax error around
#     C:/Windows/Temp path handling).
#   - There is no node.exe on the Windows PATH; use the portable node at
#     C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe
#   - playwright-core resolves via NODE_PATH=C:/Users/nolan/.local/share/pigi/fb-engage/node_modules
#   - C:/Windows/Temp/x-discover-run.ps1 wraps all of the above (mirrors x-like-run.ps1).
#   - Launch via pig_ssh (Windows OpenSSH -> powershell), never via a WSL shell.
#   - No inline powershell quoting: the CDP preflight lives in
#     C:/Windows/Temp/x-cdp-preflight.ps1 (a quoting regression here killed a pass).
#   - The probe run is bounded by `timeout` (PIG_TIMEOUT, 120s + 600s/handle,
#     overridable via X_PROBE_TIMEOUT for tests). A stall can never hang a pass:
#     on timeout the launcher prints TIMEOUT and exits 6.
#   - Circuit-breaker (x-probe-circuit.sh, 2026-09-28): 3 consecutive
#     zero-output timeouts OPEN the circuit; while open, the probe is
#     short-circuited (fail-closed, exit 6) instead of burning the bound.
#     Half-open retry after 6h (X_PROBE_CIRCUIT_COOLDOWN); first successful
#     JSON closes the circuit immediately. State: x-probe-circuit.json.
#   - One-driver preflight (2026-09-29, interval 08 timeout hardening): the
#     probe holds no lock but shares the Pig's single headed X Chrome with
#     the write drivers. Pass x-20260929-1723 launched the probe into a
#     follow batch's window and the probe stalled the full 3120s bound with
#     zero output. Before launching, the probe waits bounded (10 min,
#     X_PROBE_DRIVER_WAIT_SECS) for any active write driver (lock held, or a
#     follow/like/comment node process alive) to finish; if one is still
#     active it exits 6 fast instead of burning the probe bound. Lock
#     contention is not a probe stall: the circuit-breaker counter is left
#     untouched on this path.
#   - The Pig-side wrapper (x-discover-run.ps1) enforces a REMOTE-SIDE watchdog
#     (Wait-Job -Timeout) at launcher bound + 60s, passed as its 3rd arg. The
#     launcher killing the local ssh client can orphan the remote node probe
#     holding a CDP page; the watchdog kills it (exit 7 from the wrapper, mapped
#     to exit 6 here). The launcher bound always fires first, so the remote
#     watchdog is a backstop, never the primary bound.
#
# Usage: x-probe-discover.sh <handle1,handle2,...> [hours] [out.json]
#   Prints the probe's JSON to stdout, and to out.json if given.
#   Exit codes: 0 = probe ran (check JSON for results/notes), 2 = usage error,
#   4 = CDP down (X Chrome window closed; stay-on-rule zero-engagement outcome),
#   6 = probe TIMEOUT or write-driver contention (fail-closed, zero engagement),
#   other = bridge failure.
#
# FAIL-CLOSED CONTRACT: any nonzero exit means the pass performs ZERO X actions.
# A probe failure never silently skips to engagement.
#
# The probe is READ-ONLY: page loads + scrolls only, no clicks, no likes.
# It is slow when X is sluggish (~1-9 min/handle observed).
source "$(dirname "$0")/pig-ssh.sh"
source "$(dirname "$0")/x-probe-circuit.sh"

[ $# -ge 1 ] || { echo "usage: x-probe-discover.sh <h1,h2,...> [hours] [out.json]" >&2; exit 2; }
HANDLES="$1"; HOURS="${2:-48}"; OUT="${3:-}"
N=$(printf '%s' "$HANDLES" | tr ',' '\n' | grep -c .)
PIG_TIMEOUT="${X_PROBE_TIMEOUT:-$((120 + N * 600))}"
# Test seam for the one-driver preflight wait below (seconds).
X_PROBE_DRIVER_WAIT_SECS="${X_PROBE_DRIVER_WAIT_SECS:-600}"

command -v timeout >/dev/null 2>&1 || {
  echo "x-probe-discover: coreutils timeout(1) missing; refusing to run an unbounded probe" >&2
  exit 2
}

# Circuit-breaker (2026-09-28): after 3 consecutive zero-output timeouts the
# probe is short-circuited (fail-closed, exit 6) instead of burning the full
# bound every pass. A half-open attempt is allowed once the cooldown elapses;
# the first successful JSON output closes the circuit immediately.
if ! circuit_check; then
  exit 6
fi

PROBE_HELPER="$(dirname "$0")/pig-ssh.sh"
export PROBE_HELPER

# pig_ssh is a shell function and timeout(1) cannot invoke shell functions, so
# bounded calls run inside a child bash that re-sources the helper.
# Usage: ssh_bounded <seconds> <ssh args...>; stdin is always /dev/null.
ssh_bounded() {
  local bound="$1"; shift
  PROBE_TIMEOUT="$bound" timeout --signal=TERM --kill-after=30 "$bound" \
    bash -c 'source "$PROBE_HELPER"; PIG_TIMEOUT="$PROBE_TIMEOUT" pig_ssh "$@" < /dev/null' _ "$@"
}

# One-driver preflight (2026-09-29, interval 08): the probe is read-only and
# holds no lock, but it shares the Pig's single headed X Chrome with the
# write drivers. A write driver is "active" when it holds x-engage.lock (the
# comment/like runners hold it for their whole run, including pacing sleeps)
# or when a follow/like/comment node process is alive (the follow batch holds
# no lock). Prints ACTIVE/IDLE via the family WMI pattern; an unreachable Pig
# reads as IDLE (fail-open: a read-only probe launching is today's behavior).
write_driver_active() {
  ssh_bounded 40 'powershell -NoProfile -Command "if ((Test-Path C:/Windows/Temp/x-engage.lock) -or (Get-CimInstance Win32_Process -Filter \"Name=''node.exe''\" | Where-Object { ($_.CommandLine -like ''*x-follow*'') -or ($_.CommandLine -like ''*x-like*'') -or ($_.CommandLine -like ''*x-comment*'') })) { ''ACTIVE'' } else { ''IDLE'' }"' 2>&1 | tr -d '\r\n ' | grep -q ACTIVE
}

# One-driver preflight (2026-09-29, interval 08): probe-before-follow is the
# pass order. If a write driver is active, wait bounded for it to finish
# (declared dependency: write-driver completion). If it is still active after
# the bound, exit 6 fast (fail-closed) instead of burning the whole probe
# bound against a contended browser. Lock contention is not a probe stall, so
# circuit_record is deliberately NOT called here: the breaker counter only
# tracks genuine zero-output probe timeouts.
waited=0
while write_driver_active && [ "$waited" -lt "$X_PROBE_DRIVER_WAIT_SECS" ]; do
  sleep 30; waited=$((waited+30))
done
if write_driver_active; then
  echo "x-probe-discover: write driver (follow/comment/like) still active after ${X_PROBE_DRIVER_WAIT_SECS}s; skipping probe, zero engagement" >&2
  exit 6
fi

# Preflight: CDP :9225 must be listening on the Pig (Windows side).
# File-based, no inline quoting (see header).
if ! ssh_bounded 40 "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/x-cdp-preflight.ps1" 2>&1 | grep -q CDP_UP; then
  echo "x-probe-discover: CDP :9225 not reachable on Pig; X Chrome window may be closed" >&2
  exit 4
fi

# Bounded probe run: a stalled probe is killed and recorded as TIMEOUT.
# The wrapper enforces its own remote-side watchdog at bound + 60s (3rd arg),
# so a killed ssh session can never orphan the probe on the Pig.
WATCHDOG=$((PIG_TIMEOUT + 60))
JSON=$(ssh_bounded "$PIG_TIMEOUT" "powershell -NoProfile -ExecutionPolicy Bypass -File C:/Windows/Temp/x-discover-run.ps1 $HANDLES $HOURS $WATCHDOG" 2>&1)
rc=$?
if [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
  echo "x-probe-discover: TIMEOUT after ${PIG_TIMEOUT}s ($N handle(s)); probe killed, zero engagement" >&2
  circuit_record timeout
  exit 6
fi
if [ "$rc" -eq 7 ]; then
  echo "x-probe-discover: REMOTE WATCHDOG fired on Pig (probe exceeded remote bound); zero engagement" >&2
  circuit_record timeout
  exit 6
fi
# The probe prints exactly one JSON line on stdout; powershell may add noise.
LINE=$(printf '%s' "$JSON" | grep -E '^\{"results"' | tail -1)
if [ -z "$LINE" ]; then
  echo "x-probe-discover: no JSON output from probe (rc=$rc)" >&2
  printf '%s\n' "$JSON" | tail -5 >&2
  exit 1
fi
if [ -n "$OUT" ]; then
  printf '%s\n' "$LINE" > "$OUT"
fi
printf '%s\n' "$LINE"
circuit_record success
exit 0
