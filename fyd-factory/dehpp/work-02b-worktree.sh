#!/bin/bash
set -e
cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD
echo "=== create clean worktree for fyd-dehpp on Pig-local disk ==="
git worktree add /home/nolan/fyd-dehpp-wt fyd-dehpp 2>&1 | tail -2
cd /home/nolan/fyd-dehpp-wt
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
echo "dirty count:"
git status --porcelain | wc -l
