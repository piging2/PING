#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== next.config.ts ==="
cat next.config.ts
echo "=== DEV_MODE_SKIP_KV refs ==="
grep -rn "DEV_MODE_SKIP_KV" src/ --include="*.ts" --include="*.tsx" -l | head -10
echo "=== by-id.ts head ==="
head -50 src/fyd/object/by-id.ts
echo "=== npm ci progress ==="
tail -3 /home/nolan/fyd-preview-wt/npm-ci.log 2>/dev/null; pgrep -f "npm ci" >/dev/null && echo "NPM_CI_RUNNING" || echo "NPM_CI_DONE"
