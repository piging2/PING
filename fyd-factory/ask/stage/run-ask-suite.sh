#!/bin/bash
cd /home/nolan/projects/ping
echo "=== full ask lane suite ==="
npx jest --config src/fyd/ask/jest.config.cjs 2>&1 | tail -25
echo
echo "=== git status (should show only the 2 new files as untracked) ==="
git status --porcelain -- src/fyd/ask/
