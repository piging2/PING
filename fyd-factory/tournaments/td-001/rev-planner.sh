#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== planner.ts:60-140 ==="
sed -n '60,140p' src/fyd/builder/planner.ts
echo "=== where does the planner build section queries? ==="
grep -n "query" src/fyd/builder/planner.ts | head -30
