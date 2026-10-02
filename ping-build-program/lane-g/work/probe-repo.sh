#!/bin/bash
set -u
cd /home/nolan/projects/ping || { echo "NO-REPO"; exit 1; }
echo "--- worktree ---"
git worktree list --porcelain
echo "--- branch ---"
git branch --show-current
echo "--- status (head 25) ---"
git status --short | head -25
echo "--- ask dir ---"
ls -la src/fyd/ask/
echo "--- ask route ---"
ls src/app/api/fyd/ask/ 2>/dev/null || echo "no ask api dir"
