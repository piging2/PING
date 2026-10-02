#!/bin/bash
# LANE BCQ: dynamic repo verification (read-only)
set -u
cd /home/nolan/projects/ping || { echo "NO_REPO"; exit 1; }
echo "=== worktrees ==="
git worktree list --porcelain
echo "=== branch ==="
git branch --show-current
echo "=== HEAD ==="
git rev-parse HEAD
echo "=== status (first 15) ==="
git status --short | head -15
echo "=== layout probe ==="
ls src/fyd/acquisition/ 2>/dev/null
ls src/fyd/ | head -20
