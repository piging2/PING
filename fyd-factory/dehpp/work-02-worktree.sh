#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== branches ==="
git branch --list | head -20
echo "=== switch main dir back to fyd-factory, dirty files untouched ==="
git checkout fyd-factory 2>&1 | tail -2
git status --porcelain | wc -l
echo "=== create clean worktree for fyd-dehpp ==="
git worktree add /home/hatch/workspace/fyd-factory/dehpp/.dehpp-wt fyd-dehpp 2>&1 | tail -2
cd /home/hatch/workspace/fyd-factory/dehpp/.dehpp-wt
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --porcelain | wc -l
