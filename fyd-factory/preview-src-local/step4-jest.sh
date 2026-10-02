#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== jest suites ==="
npx jest --testPathPatterns="src/fyd/(ask|sitespec|customize)/__tests__" --silent 2>&1 | tail -25
echo "=== owner-mode tests ==="
npx jest --testPathPatterns="owner-mode" --silent 2>&1 | tail -15
