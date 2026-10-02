#!/bin/bash
# SWARM-11 read-only survey: run/task/attempt state machines in the PING runtime substrate.
# Targets: /home/nolan/ping (PING server + gateway runtime) and /home/nolan/ping-gateway-src if needed.
R=${1:-/home/nolan/ping}
echo "## REPO: $R"
(cd "$R" && git log --oneline -1 2>/dev/null; git status --short 2>/dev/null | head -5)
echo
echo "## 1. orchestration + workers file listing"
find "$R/ping-runtime" "$R/gateway" -maxdepth 2 -type f 2>/dev/null | head -60
echo
echo "## 2. status/state literals across ping-runtime + gateway"
grep -rhoE "['\"][A-Z_]{3,25}['\"]" "$R/ping-runtime" "$R/gateway" --include='*.js' 2>/dev/null | tr -d "'\"" | sort | uniq -c | sort -rn | head -80
