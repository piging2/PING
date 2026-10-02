#!/bin/bash
cd /home/nolan/projects/ping
echo "=== repo/worktree/branch/commit ==="
git rev-parse --show-toplevel 2>/dev/null
git branch --show-current 2>/dev/null
git rev-parse HEAD 2>/dev/null
git status --short | head -5
echo "=== happy-place route in repo ==="
ls src/app/sites/ 2>/dev/null
find src/app/sites -maxdepth 2 -name "page.tsx" 2>/dev/null
echo "=== git log for happy-place (recent 15) ==="
git log --oneline -15 -- src/app/sites/happy-place/ 2>/dev/null
echo "=== other candidate repos on Pig ==="
ls /home/nolan/projects/ 2>/dev/null
ls /home/nolan/ 2>/dev/null | head -20
