#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== builder/dogfood contents ==="
ls -R src/fyd/builder/dogfood 2>/dev/null | head -20
echo "=== hand-built FYDSection/spec literals in src (outside generator/tests) ==="
grep -rln "sections: \[" src/fyd --include="*.ts" | grep -v __tests__ | grep -v "\.test\." | head
echo "=== direct validateSiteSpec callers (routes/tools) ==="
grep -rn "validateSiteSpec" src/app src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "\.test\." | grep -v "sitespec/validator" | head -20
