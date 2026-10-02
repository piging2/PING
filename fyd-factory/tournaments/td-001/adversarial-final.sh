#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== __tests__ dir exists? ==="
ls src/fyd/sitespec/__tests__/ | head
echo "=== fixture has public external_identity? ==="
grep -c "external_identity" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
grep -n "external_identity" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -5
echo "=== working tree clean? ==="
git status --porcelain | head -5; echo "(empty = clean)"
