#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== claimBadgeLabel fn (200-245) ==="
sed -n '200,245p' src/fyd/components/renderer.tsx
echo ""
echo "=== CTA section (1490-1560) ==="
sed -n '1490,1560p' src/fyd/components/renderer.tsx
