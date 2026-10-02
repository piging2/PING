#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== boundFieldValue ==="
awk '/function boundFieldValue/,/^}/' src/fyd/sitespec/graph.ts | head -30
echo ""
echo "=== jest configs ==="
find src/fyd -maxdepth 2 -name "jest.config.cjs" | head
echo ""
echo "=== package.json test scripts ==="
grep -n '"test' package.json | head -10
echo ""
echo "=== node version, tsx ==="
node --version; ls node_modules/.bin/ | grep -E "^(tsx|jest|tsc)$"
