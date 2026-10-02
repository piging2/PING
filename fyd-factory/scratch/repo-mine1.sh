#!/bin/bash
cd /home/nolan/projects/ping
echo "=== BRANCH ==="
git branch --show-current
echo "=== STATUS (porcelain, first 20) ==="
git status --porcelain | head -20
echo "=== LOG fix/revert/regression (last 30) ==="
git log --oneline -i --grep="fix\|revert\|broken\|regression" -- src/fyd | head -30
echo "=== REVERT commits (last 15) ==="
git log --oneline -i --grep="revert" | head -15
echo "=== ALL BRANCHES ==="
git branch -a
echo "=== FYD recent log (last 20) ==="
git log --oneline -20 -- src/fyd
