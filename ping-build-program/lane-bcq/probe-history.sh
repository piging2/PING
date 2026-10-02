#!/bin/bash
set -u
echo "=== git log --grep=connector (last 20) ==="
git -C /home/nolan/projects/ping log --oneline --grep="connector" -i | head -20
echo "=== lane L broker worktree: secret broker surface ==="
LWT=/home/nolan/projects/ping-lane-l-broker
ls "$LWT/src/fyd/" 2>/dev/null | grep -i "secret\|broker\|auth" | head
find "$LWT/src" -iname "*secret*" -not -path "*/node_modules/*" 2>/dev/null | head -10
