#!/bin/bash
cd /home/nolan/projects/ping
echo "===== coppersmith relationships (lines 195-280) ====="
sed -n '195,280p' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "===== ObjectProvenance type ====="
grep -n "interface ObjectProvenance" -A 25 src/lib/ping/types.ts
