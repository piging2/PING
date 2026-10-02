#!/bin/bash
cd /home/nolan/projects/ping
echo "=== resolveBoundField ==="
sed -n '120,220p' src/fyd/sitespec/graph.ts
echo ""
echo "=== renderer: section -> field mapping (Hero/Services/Contact components) ==="
grep -n "resolveBoundField\|case \"" src/fyd/components/renderer.tsx | head -40
