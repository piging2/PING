#!/bin/bash
# SWARM-10 scan 3: map /home/nolan/ping substrate structure. Read-only.
R=/home/nolan/ping
cd "$R" || exit 1
echo "===== TOP ====="
ls | head -80
echo "===== GATEWAY ====="
ls gateway 2>/dev/null | head -60
echo "===== GATEWAY ROUTES ====="
ls gateway/routes 2>/dev/null | head -40
echo "===== CURIOUS-SQUID? ====="
ls -d curious-squid 2>/dev/null; ls curious-squid 2>/dev/null | head -30
echo "===== GIT STATUS (short) ====="
git status --short 2>/dev/null | head -20
echo "===== GIT BRANCH/HEAD ====="
git branch --show-current 2>/dev/null; git rev-parse --short HEAD 2>/dev/null
