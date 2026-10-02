#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== sortKeys ==="
sed -n '140,177p' src/fyd/sitespec/render-model.ts
echo "=== renderer 220-240, 735-760 ==="
sed -n '220,240p' src/fyd/components/renderer.tsx
echo "---"
sed -n '735,760p' src/fyd/components/renderer.tsx
echo "=== happy-place-graph head ==="
head -50 src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
echo "=== coppersmith graph export name ==="
grep -n "^export" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head
