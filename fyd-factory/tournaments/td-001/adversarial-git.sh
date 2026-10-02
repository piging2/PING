#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== git branch + HEAD ==="
git branch --show-current
git rev-parse --short HEAD
echo "=== 4a9cc919 exists? ==="
git log --oneline -1 4a9cc919 2>&1
echo "=== 4a9cc919 date/subject ==="
git show -s --format='%h %ad %s' --date=iso 4a9cc919 2>&1
echo "=== what files did 4a9cc919 touch ==="
git show --stat --oneline 4a9cc919 2>&1 | head -30
echo "=== pre-fix explorePage (parent of 4a9cc919) ==="
git show 4a9cc919^:src/fyd/proceduralize/generator.ts 2>&1 | grep -n -A8 "EXPLORE" | head -20
echo "=== post-fix explorePage diff ==="
git show 4a9cc919 -- src/fyd/proceduralize/generator.ts 2>&1 | grep -n -B3 -A12 "explorePage" | head -60
