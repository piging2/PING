#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== buildRenderContext ==="
grep -n "buildRenderContext" src/fyd/components/renderer.tsx | head -3
sed -n "$(grep -n 'export function buildRenderContext' src/fyd/components/renderer.tsx | cut -d: -f1),+40p" src/fyd/components/renderer.tsx
echo ""
echo "=== SocialProof section (1470-1490) ==="
sed -n '1462,1490p' src/fyd/components/renderer.tsx
echo ""
echo "=== registry: SocialProof ==="
grep -n "SocialProof" src/fyd/components/registry.ts | head
