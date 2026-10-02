#!/bin/bash
# wsl-run.sh — run a script inside Pig WSL (Ubuntu) as nolan.
# Usage: wsl-run.sh <script-file> [timeout-secs]
# Passes script bytes on stdin to avoid PowerShell quoting corruption.
# Output of commands inside WSL is UTF-8 (do NOT iconv it).
SCRIPT="$1"
TIMEOUT="${2:-120}"
if [ -z "$SCRIPT" ] || [ ! -f "$SCRIPT" ]; then
  echo "usage: wsl-run.sh <script-file> [timeout]" >&2
  exit 2
fi
PIG_SSH_KEY="${PIG_SSH_KEY:-/home/hatch/.ssh/id_ed25519}"
PIG_KNOWN_HOSTS="${PIG_KNOWN_HOSTS:-/home/hatch/workspace/pig/known_hosts}"
PIG_HOST="${PIG_HOST:-nolan@100.79.154.43}"
timeout "$TIMEOUT" ssh -i "$PIG_SSH_KEY" -o BatchMode=yes -o ConnectTimeout=20 \
  -o UserKnownHostsFile="$PIG_KNOWN_HOSTS" \
  -o ProxyCommand='nc -X connect -x hatch-egress-proxy:3130 %h %p' \
  "$PIG_HOST" "wsl.exe -u nolan -- bash -s" < "$SCRIPT" 2>&1
