#!/bin/bash
cd /home/nolan/projects/ping
echo "--- visibility helpers in graph.ts ---"
grep -n "isVisible\|visibility" src/fyd/sitespec/graph.ts | head -20
echo "--- renderer visibility usage ---"
grep -rn "isVisible\|viewer\|visibility" src/fyd/components/renderer.tsx | head -25
echo "--- who else filters visibility ---"
grep -rln "isVisibleToViewer" src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | head
