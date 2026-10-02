#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== builder files at frozen ==="
ls src/fyd/builder/
echo ""
echo "=== planner.ts head (exports) ==="
grep -n "^export" src/fyd/builder/planner.ts | head -30
echo ""
echo "=== dimensions.ts head ==="
head -60 src/fyd/builder/dimensions.ts
echo ""
echo "=== generator.ts: section/page order emission ==="
grep -n "applyArchetype\|profile" src/fyd/proceduralize/generator.ts | head -20
echo ""
echo "=== generator lines 150-320 ==="
sed -n '150,320p' src/fyd/proceduralize/generator.ts
