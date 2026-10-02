#!/bin/bash
# F5-CEILING probe E: TS runners, fixtures, determinism probe, site app dirs
set -e
cd /home/nolan/projects/ping
echo "=== ts runners ==="
ls node_modules/.bin/ 2>/dev/null | grep -iE "^(tsx|ts-node|esbuild|swc)" | head
echo "=== determinism probe ==="
head -80 src/fyd/sitespec/__tests__/determinism-probe.ts
echo "=== fixtures ==="
ls src/fyd/proceduralize/__fixtures__/
echo "=== site app dir happy-place ==="
find src/app/sites/happy-place -type f | head -20
echo "=== dogfood script head ==="
head -60 src/fyd/builder/dogfood/build-ping-fyd-projection.mjs
