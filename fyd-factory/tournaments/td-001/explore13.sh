#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== package.json scripts ====="
grep -A20 '"scripts"' package.json | head -30
echo "===== validator.test.ts ====="
sed -n '1,60p' src/fyd/sitespec/__tests__/validator.test.ts
echo "===== which coppersmith spec tests exist ====="
grep -rln "COPPERSMITH_GRAPH" src --include="*.test.ts" | head
