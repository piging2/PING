#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== fixture exports ====="
head -30 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
grep -n "^export" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo
echo "===== generateSiteSpec signature ====="
grep -n "export function generateSiteSpec\|interface GeneratorOptions" src/fyd/proceduralize/generator.ts
sed -n '/interface GeneratorOptions/,/^}/p' src/fyd/proceduralize/generator.ts
echo
echo "===== schemas.test.ts usage pattern ====="
grep -n "generateSiteSpec\|validateSiteSpec\|coppersmith" src/fyd/sitespec/__tests__/schemas.test.ts src/fyd/proceduralize/__tests__/*.ts 2>/dev/null | head -20
