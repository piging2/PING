#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== heading lines ==="
grep -n 'presentation.heading ?? "' src/fyd/components/renderer.tsx
echo ""
echo "=== claimBadgeLabel ==="
sed -n "$(grep -n 'export function claimBadgeLabel' src/fyd/components/renderer.tsx | cut -d: -f1),+16p" src/fyd/components/renderer.tsx
