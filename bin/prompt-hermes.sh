#!/bin/bash
# prompt-hermes.sh — send a headless prompt to Hermes (oneshot mode) via the Pig SSH boundary.
# Usage: prompt-hermes.sh "your prompt"      or      echo "your prompt" | prompt-hermes.sh
# Prints the model's final response on stdout. Any prompt content is safe (file-based, no shell quoting).
# Pig-side bridge lives at the PERSISTENT path C:\Users\nolan\hermes-bridge\
# (moved out of C:\Windows\Temp 2026-09-26 — Temp is volatile; originals were
# silently lost 2026-09-25). Do not move the bridge back to Temp.
set -u
if [ $# -gt 0 ]; then PROMPT="$*"; else PROMPT="$(cat)"; fi
[ -z "${PROMPT// }" ] && { echo "usage: prompt-hermes.sh \"prompt\" | stdin" >&2; exit 2; }
KEY=/home/hatch/.ssh/id_ed25519
KH=/home/hatch/workspace/pig/known_hosts
PROXY='nc -X connect -x hatch-egress-proxy:3130 %h %p'
NOLAN="nolan@100.79.154.43"
PIG_BRIDGE='C:/Users/nolan/hermes-bridge'
TF="$(mktemp /tmp/hermes-prompt.XXXXXX)"
printf '%s' "$PROMPT" > "$TF"
scp -i "$KEY" -o BatchMode=yes -o ConnectTimeout=25 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PROXY" \
  "$TF" "$NOLAN:$PIG_BRIDGE/hermes-prompt.txt" >/dev/null 2>&1 || { echo "scp failed" >&2; rm -f "$TF"; exit 1; }
rm -f "$TF"
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=900 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PROXY" \
  "$NOLAN" 'wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh' 2>/dev/null
