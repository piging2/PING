#!/bin/bash
cd /home/nolan/projects/ping
echo "=== sitespec/graph.ts (bindings) ==="
grep -n "PresentationBinding\|verifyPresentationBinding" src/fyd/sitespec/graph.ts | head -20
echo ""
sed -n '1,120p' src/fyd/sitespec/graph.ts
