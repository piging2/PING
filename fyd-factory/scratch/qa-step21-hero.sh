#!/bin/bash
cd /home/nolan/projects/ping
echo "=== boundValue helper + claim comment ==="
sed -n '685,730p' src/fyd/components/renderer.tsx
echo ""
echo "=== Hero render ==="
sed -n '1753,1900p' src/fyd/components/renderer.tsx | grep -n "boundValue\|fieldValue\|objectId\|classification" | head -30
