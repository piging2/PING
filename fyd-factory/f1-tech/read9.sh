#!/bin/bash
cd /home/nolan/projects/ping
echo "##### ObjectRail registry entry"
sed -n '88,120p' src/fyd/components/registry.ts
echo "##### getComponentDef"
sed -n '115,135p' src/fyd/components/registry.ts
echo "##### renderer: section -> component mapping"
grep -n "component" src/fyd/components/renderer.tsx | head -30
