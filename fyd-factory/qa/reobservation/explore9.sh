#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== generator.ts head ==="
head -100 src/fyd/proceduralize/generator.ts
echo ""
echo "=== coppersmith-graph fixture ==="
head -80 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "=== generator exports vs planSite ==="
grep -n "planSite\|generateSiteSpec" src/fyd/proceduralize/generator.ts | head -10
