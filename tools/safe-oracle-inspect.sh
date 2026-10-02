#!/bin/bash
# safe-oracle-inspect.sh: run an Oracle inspection script with secrets redacted
# by construction. Output can never contain a KEY=VALUE secret again.
#
# Usage:
#   safe-oracle-inspect.sh <script-file>     # script file piped to oracle-ssh.sh -s
#   safe-oracle-inspect.sh -                 # read script from stdin
#
# Raw (unredacted) inspection is explicit and exceptional:
#   SAFE_INSPECT_RAW=1 safe-oracle-inspect.sh --raw <script-file>
# Without SAFE_INSPECT_RAW=1, --raw refuses. Raw output is never logged to a
# file by this wrapper; keep it machine-local (eyes only, no copy/paste).
#
# Learned from FL-20260920-022: a container env listing printed the PostgreSQL
# password into tool output. Normal diagnostics now go through this wrapper.
set -u

TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORACLE_SSH="$HOME/workspace/pig-fb/oracle-ssh.sh"

if [ ! -x "$ORACLE_SSH" ]; then
  echo "safe-oracle-inspect: oracle-ssh.sh not found at $ORACLE_SSH" >&2
  exit 2
fi

RAW=0
if [ "${1:-}" = "--raw" ]; then
  RAW=1
  shift
fi

if [ "$RAW" = "1" ]; then
  if [ "${SAFE_INSPECT_RAW:-}" != "1" ]; then
    echo "safe-oracle-inspect: --raw refused. Raw inspection is exceptional:" >&2
    echo "  re-run with SAFE_INSPECT_RAW=1 and keep the output machine-local." >&2
    exit 3
  fi
  echo "WARNING: unredacted output follows. Do not copy secrets anywhere." >&2
fi

SRC="${1:-}"
if [ -z "$SRC" ]; then
  echo "usage: safe-oracle-inspect.sh [--raw] <script-file>|--" >&2
  exit 2
fi

run_ssh() {
  if [ "$SRC" = "-" ]; then
    "$ORACLE_SSH" -s
  else
    "$ORACLE_SSH" -s < "$SRC"
  fi
}

if [ "$RAW" = "1" ]; then
  run_ssh
else
  run_ssh 2>&1 | python3 "$TOOLS_DIR/redact-secrets.py"
fi
