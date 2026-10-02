#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== fixtures ==="
ls src/fyd/proceduralize/__fixtures__/ 2>/dev/null
echo "=== canonicalizeModel impl ==="
grep -n "export function canonicalizeModel" -A 40 src/fyd/sitespec/render-model.ts | head -60
echo "=== css-register.cjs ==="
cat src/fyd/sitespec/__tests__/css-register.cjs
echo "=== nondet grep in render path ==="
grep -rn "Date\.now\|Math\.random\|randomUUID\|toLocaleString\|Intl\." src/fyd/sitespec/render-model.ts src/fyd/components/renderer.tsx src/fyd/sitespec/field-visibility.ts src/fyd/sitespec/safe-link.ts src/fyd/sitespec/graph.ts 2>/dev/null | head -20
echo "=== Object.keys / Map iteration in render path ==="
grep -n "Object\.keys\|Object\.entries\|Object\.values\|new Map\|new Set" src/fyd/sitespec/render-model.ts src/fyd/components/renderer.tsx | head -20
