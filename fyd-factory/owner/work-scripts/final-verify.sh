#!/bin/bash
cd /home/nolan/projects/ping
echo "=== new files in lane dirs (untracked) ==="
git status --porcelain | grep "^??" | grep -E "src/fyd/(owner-mode|customize)/" 
echo "=== any modifications by this lane outside those dirs ==="
git status --porcelain | grep -v "^??" | grep -E "src/fyd/(owner-mode|customize)/" || echo "(none)"
echo "=== full test run ==="
npx jest --config src/fyd/owner-mode/jest.config.cjs 2>&1 | tail -5
npx jest --config src/fyd/customize/jest.config.cjs 2>&1 | tail -5
