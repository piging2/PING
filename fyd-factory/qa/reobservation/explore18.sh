#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== json-ld emit anywhere in app ==="
grep -rln "application/ld" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v __tests__ | grep -v node_modules | head -10
echo ""
echo "=== site-client render: how sections resolve ==="
ls src/app/sites/_shared/ 2>/dev/null
grep -rn "query\b" src/app/sites/_shared/*.tsx 2>/dev/null | head -8
