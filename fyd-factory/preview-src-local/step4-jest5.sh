#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== owner-mode tests in repo? ==="
ls src/fyd/owner-mode/__tests__/ 2>/dev/null || echo "none in repo"
echo "=== run ask suite ==="
npx jest --config src/fyd/ask/jest.config.cjs --silent 2>&1 | tail -8
echo "=== run sitespec suite ==="
npx jest --config src/fyd/sitespec/jest.config.cjs --silent 2>&1 | tail -8
echo "=== run customize suite ==="
npx jest --config src/fyd/customize/jest.config.cjs --silent 2>&1 | tail -8
