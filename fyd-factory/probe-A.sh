#!/bin/bash
# LANE-ARCH probe A: repo state, dirty files, top-level structure (read-only)
set -u
REPO=/home/nolan/projects/ping
echo "=== REPO ==="
ls -d "$REPO" && cd "$REPO" && pwd
echo "=== BRANCH ==="
git branch --show-current 2>/dev/null
echo "=== LAST COMMITS ==="
git log --oneline -5 2>/dev/null
echo "=== DIRTY COUNT ==="
git status --porcelain 2>/dev/null | wc -l
echo "=== DIRTY FILES (porcelain) ==="
git status --porcelain 2>/dev/null
echo "=== TOP LEVEL ==="
ls -1 "$REPO"
echo "=== SRC TREE (depth 2) ==="
ls -1 "$REPO/src" 2>/dev/null
echo "=== src/fyd (depth 2) ==="
ls -1 "$REPO/src/fyd" 2>/dev/null
