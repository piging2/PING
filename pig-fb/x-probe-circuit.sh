#!/bin/bash
# x-probe-circuit.sh: circuit-breaker for the X discovery probe.
# Sourced by x-probe-discover.sh (not run directly).
#
# Problem: when X/CDP is wedged, every pass burns the full probe bound
# (120s + 600s/handle) on a zero-output timeout. Evidence: 22 consecutive
# timeouts by the 2026-09-28 architecture review.
#
# Behavior:
# - 3 consecutive zero-output timeouts -> circuit OPENS.
# - While open, the probe is SHORT-CIRCUITED (skipped, fail-closed, exit 6)
#   unless COOLDOWN seconds elapsed since the last real attempt (half-open:
#   one real probe is allowed through).
# - First successful JSON output -> circuit CLOSES immediately, counter reset.
# - Non-timeout outcomes (CDP down, fast no-JSON, bridge errors) neither
#   advance nor reset the counter; only timeouts advance it, only success
#   resets it.
#
# State: JSON file at $X_PROBE_CIRCUIT_FILE (default
# ~/workspace/pig-fb/x-probe-circuit.json), written atomically.
# Test seams: X_PROBE_CIRCUIT_FILE, X_PROBE_CIRCUIT_COOLDOWN (seconds).

X_PROBE_CIRCUIT_FILE="${X_PROBE_CIRCUIT_FILE:-$HOME/workspace/pig-fb/x-probe-circuit.json}"
X_PROBE_CIRCUIT_COOLDOWN="${X_PROBE_CIRCUIT_COOLDOWN:-21600}"  # 6h
X_PROBE_CIRCUIT_THRESHOLD=3

_circuit_now() { date +%s; }

_circuit_read() {
  # Prints "consecutive_timeouts last_attempt_ts"; "0 0" when the state
  # file is missing or invalid (fail-closed toward allowing the probe).
  python3 - "$X_PROBE_CIRCUIT_FILE" <<'PYEOF' 2>/dev/null || echo "0 0"
import json, sys
try:
    with open(sys.argv[1]) as f:
        s = json.load(f)
    print(int(s.get("consecutive_timeouts", 0)), int(s.get("last_attempt_ts", 0)))
except Exception:
    print("0 0")
PYEOF
}

_circuit_write() {
  # _circuit_write <consecutive_timeouts> <last_attempt_ts>; atomic.
  local tmp="$X_PROBE_CIRCUIT_FILE.tmp.$$"
  printf '{"consecutive_timeouts":%d,"last_attempt_ts":%d}\n' "$1" "$2" > "$tmp"
  mv -f "$tmp" "$X_PROBE_CIRCUIT_FILE"
}

# circuit_check: return 0 if the probe may run, 1 if it must short-circuit.
# Prints the reason on stderr when short-circuiting.
circuit_check() {
  local timeouts last_attempt now
  read -r timeouts last_attempt < <(_circuit_read)
  now=$(_circuit_now)
  if [ "$timeouts" -ge "$X_PROBE_CIRCUIT_THRESHOLD" ]; then
    if [ $((now - last_attempt)) -ge "$X_PROBE_CIRCUIT_COOLDOWN" ]; then
      echo "x-probe-circuit: HALF-OPEN ($timeouts consecutive timeouts, cooldown ${X_PROBE_CIRCUIT_COOLDOWN}s elapsed); attempting probe" >&2
      return 0
    fi
    echo "x-probe-circuit: OPEN ($timeouts consecutive zero-output timeouts); short-circuiting probe, zero engagement" >&2
    return 1
  fi
  return 0
}

# circuit_record <timeout|success|other>: advance/reset/leave the counter.
# Only timeouts advance it; only a successful JSON output resets it.
circuit_record() {
  local outcome="$1" timeouts last_attempt now
  read -r timeouts last_attempt < <(_circuit_read)
  now=$(_circuit_now)
  case "$outcome" in
    timeout) _circuit_write $((timeouts + 1)) "$now" ;;
    success) _circuit_write 0 "$now" ;;
    *) : ;;
  esac
}
