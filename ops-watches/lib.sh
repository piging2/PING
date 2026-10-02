#!/usr/bin/env bash
# ops-watches shared helpers. Source from each check: . "$(dirname "$0")/lib.sh"
# Exit codes: 0 = OK, 1 = WARN, 2 = CRIT. Every check prints ONE JSON line.
set -u
WATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH="${OPS_SSH:-$HOME/workspace/pig-fb/oracle-ssh.sh}"  # OPS_SSH overrides the
# transport for deterministic tests (a stub can stand in for the real ssh).
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

# run_remote2 <script-string> <stderr-file> -> remote stdout on stdout;
# returns the ssh exit code; ALL stderr (ssh diagnostics + remote stderr)
# lands in <stderr-file>. Lets callers distinguish transport failure
# (no remote execution at all) from a remote command that ran and failed.
run_remote2() { echo "$1" | "$SSH" -s 2>"$2"; }

# fail_unknown_unless_sentinel <check> <detail> <out>
# The remote leg must print SENTINEL=ORACLE_OK as its first line. If the
# sentinel is missing, the remote script never executed: the check emits
# UNKNOWN (exit 1) instead of parsing transport silence into a false
# OK/WARN/CRIT. Callers then strip the sentinel line before parsing.
fail_unknown_unless_sentinel() {
  local check="$1" detail="$2" out="$3"
  if ! grep -q '^SENTINEL=ORACLE_OK$' <<<"$out"; then
    emit "$check" UNKNOWN "$detail"; exit 1
  fi
}

strip_sentinel() { grep -v '^SENTINEL=ORACLE_OK$' <<<"$1"; }
