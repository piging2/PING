#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== tsconfig paths ==="
cat tsconfig.json 2>/dev/null | head -40
echo "=== node/npx/tsx ==="
node --version; which npx tsx 2>/dev/null; ls node_modules/.bin/ 2>/dev/null | grep -E "^(tsx|ts-node|jest)$"
echo "=== renderer.tsx imports (top 40) ==="
head -60 src/fyd/components/renderer.tsx | grep -E "^import|from" | head -40
echo "=== sitespec/types.ts head ==="
grep -n "export interface ViewerContext\|export interface ObjectGraph\|export interface FYDSiteSpec" src/fyd/sitespec/types.ts
