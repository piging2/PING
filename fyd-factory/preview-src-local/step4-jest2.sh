#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
npx jest --testPathPatterns="src/fyd/sitespec/__tests__/safe-link" 2>&1 | head -30
echo "=== jest config ==="
cat jest.config.* 2>/dev/null | head -40
