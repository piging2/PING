#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git status --porcelain | grep -v "^??" | head -20
echo "=== untracked ==="
git status --porcelain | grep "^??" | head -20
echo "=== tsc ==="
npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
echo "TSC_EXIT:$?"
