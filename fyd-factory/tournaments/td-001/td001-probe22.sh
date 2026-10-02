#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== generator.test.ts head ====="
sed -n '1,70p' src/fyd/proceduralize/__tests__/generator.test.ts
echo
echo "===== visibility.ts conventions ====="
sed -n '1,60p' src/fyd/builder/visibility.ts
echo
echo "===== does any test combine generate + validate? ====="
grep -rln "validateSiteSpec" src/fyd/proceduralize/__tests__ src/fyd/sitespec/__tests__ | head
