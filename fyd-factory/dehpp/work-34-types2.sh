#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== FYDPage / FYDNavItem ==="
grep -n "interface FYDPage\|interface FYDNavItem\|navLabel" src/fyd/sitespec/types.ts | head -10
echo ""
echo "=== buildRenderContext callers ==="
grep -rn "buildRenderContext" src --include=*.ts --include=*.tsx | grep -v "renderer.tsx" | head
echo ""
echo "=== site-client importers ==="
grep -rln "sites/_shared/site-client" src --include=*.tsx | head
echo ""
echo "=== FYDPresentation ==="
grep -n "interface FYDPresentation" -A 20 src/fyd/sitespec/types.ts | head -25
