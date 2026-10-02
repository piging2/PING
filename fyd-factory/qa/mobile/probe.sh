#!/bin/bash
# QA-MOBILE probe: run inside Pig WSL as nolan
REPO=/home/nolan/projects/ping
cd "$REPO" 2>/dev/null || { echo "NO_REPO"; exit 1; }
echo "=== branch ==="
git branch --show-current 2>/dev/null || echo "git-branch-unknown"
git status --porcelain 2>/dev/null | head -5
echo "=== test file ==="
ls -la src/fyd/components/__tests__/mobile-visibility.test.ts 2>/dev/null || echo "TEST_FILE_MISSING"
echo "=== dev server ==="
curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3100/sites/coppersmith-plumbing; echo
