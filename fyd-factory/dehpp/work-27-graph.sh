#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "resolveBoundField\|verifyPresentationBinding" src/fyd/components/renderer.tsx src/fyd/sitespec/graph.ts | head
echo ""
echo "=== verifyPresentationBinding ==="
awk '/export function verifyPresentationBinding/,/^}/' src/fyd/sitespec/graph.ts | head -60
