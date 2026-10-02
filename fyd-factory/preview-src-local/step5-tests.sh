#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
cd "$WT"
export PATH=/home/nolan/.nvm/versions/node/v22.23.2/bin:$PATH
export NEXT_TELEMETRY_DISABLED=1

echo "=== Ask lane tests ==="
npx jest --config src/fyd/ask/jest.config.cjs 2>&1 | tail -15
echo ""
echo "=== SiteSpec lane tests ==="
npx jest --config src/fyd/sitespec/jest.config.cjs 2>&1 | tail -15
echo ""
echo "=== Customize lane tests ==="
npx jest --config src/fyd/customize/jest.config.cjs 2>&1 | tail -15
