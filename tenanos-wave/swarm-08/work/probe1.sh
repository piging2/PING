#!/bin/bash
# swarm-08 probe 1: repo structure, mission-control files, git state (read-only)
set -u
R=/home/nolan/projects/ping
echo "=== repo root ==="
ls "$R" | head -50
echo "=== git status (read-only) ==="
cd "$R" && git status --short | head -20
echo "=== git log (read-only) ==="
git log --oneline -5 2>/dev/null
echo "=== mission_control files ==="
find "$R" -iname '*mission*control*' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -40
echo "=== routes dir ==="
ls "$R/gateway/routes" 2>/dev/null | head -60
echo "=== server on 3100 ==="
(ss -ltnp 2>/dev/null | grep 3100 || netstat -ltnp 2>/dev/null | grep 3100 || echo "no 3100 listener found") | head -5
