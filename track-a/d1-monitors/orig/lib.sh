#!/usr/bin/env bash
# ops-watches shared helpers. Source from each check: . "$(dirname "$0")/lib.sh"
# Exit codes: 0 = OK, 1 = WARN, 2 = CRIT. Every check prints ONE JSON line.
set -u
WATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH="$HOME/workspace/pig-fb/oracle-ssh.sh"
BASELINES="$WATCH_DIR/baselines"
STATE_FILE="$WATCH_DIR/state.json"

now_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# emit <check> <status> <detail>  -> single JSON line on stdout
emit() {
  local detail="${3//\"/\'}"   # neutralize double quotes; detail must be quote-free
  detail="${detail//$'\n'/ }"  # collapse newlines
  printf '{"check":"%s","status":"%s","detail":"%s","at":"%s"}\n' "$1" "$2" "$detail" "$(now_utc)"
}

# run_remote <script-string> -> prints remote stdout
run_remote() { echo "$1" | "$SSH" -s; }
