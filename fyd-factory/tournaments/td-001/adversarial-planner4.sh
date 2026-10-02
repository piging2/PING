#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== planner.ts planSite start (240-300) ==="
sed -n '240,300p' src/fyd/builder/planner.ts
echo "=== who calls generateSiteSpec inside builder? ==="
grep -rn "generateSiteSpec\|proceduralize/generator" src/fyd/builder/*.ts src/fyd/customize/*.ts 2>/dev/null | grep -v test | head
