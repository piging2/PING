#!/bin/bash
# LANE BCQ: create isolated worktree (no commits, no touching main checkout)
set -u
cd /home/nolan/projects/ping || exit 1
WT=/home/nolan/projects/ping-bcq-substrate
BRANCH=lane/bcq-connector-substrate
if [ -d "$WT" ]; then
  echo "WORKTREE_EXISTS $WT"
else
  git worktree add -b "$BRANCH" "$WT" HEAD || { echo "WORKTREE_ADD_FAILED"; exit 1; }
  echo "WORKTREE_CREATED $WT $BRANCH"
fi
echo "=== layout ==="
ls src/fyd/acquisition/ 2>/dev/null
echo "---"
ls src/fyd/ | head -25
echo "---"
ls "$WT/src/fyd/acquisition/" 2>/dev/null
echo "=== worktree status ==="
git -C "$WT" status --short | head -5
git -C "$WT" branch --show-current
