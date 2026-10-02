#!/bin/bash
# AGENT-17 probe 6: /o page capabilities source + renderer seam + explore (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== /o/[objectId]/page.tsx top 76 lines ==="
head -76 'src/app/o/[objectId]/page.tsx'
echo ""
echo "=== renderer.tsx 675-725 ==="
sed -n '675,725p' src/fyd/components/renderer.tsx
echo ""
echo "=== explore grep in src (non-test) ==="
grep -rln 'explore' src --include='*.ts' --include='*.tsx' | grep -v __tests__ | head -20
echo ""
echo "=== planner.ts 380-410 (buildVerifiedRenderModel call site) ==="
sed -n '380,410p' src/fyd/builder/planner.ts
