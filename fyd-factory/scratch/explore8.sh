#!/bin/bash
cd /home/nolan/projects/ping
echo "===== provenance kind + visibility ====="
grep -n "ObjectProvenanceKind\s*=\|type ObjectProvenanceKind" -A 15 src/lib/ping/types.ts | head -30
grep -n "ObjectVisibility\s*=" -A 6 src/lib/ping/types.ts | head -12
echo ""
echo "===== one service object full ====="
sed -n '100,140p' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
