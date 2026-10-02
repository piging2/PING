#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== consumers of acceptsSchemas ==="
grep -rn "acceptsSchemas" src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "\.test\." | head -15
echo "=== hand-written spec fixtures with bare all? ==="
grep -rn 'kind: "all"' src/fyd --include="*.ts" | grep -v __tests__ | head
echo "=== any test asserting bare-all fail-closed? ==="
grep -rln 'kind: "all"' src/fyd/sitespec/__tests__/ src/fyd/proceduralize/__tests__/ 2>/dev/null | head
