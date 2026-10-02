#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== validateSiteSpec callers ====="
grep -rn "validateSiteSpec" src --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
echo "===== in tests ====="
grep -rln "validateSiteSpec" src --include="*.test.ts" | head
echo "===== generator.test.ts head ====="
sed -n '1,75p' src/fyd/proceduralize/__tests__/generator.test.ts
