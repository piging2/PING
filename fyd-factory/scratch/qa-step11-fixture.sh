#!/bin/bash
cd /home/nolan/projects/ping
echo "=== fixture provenance sample ==="
grep -n "provenance" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -20
echo ""
echo "=== fixture header ==="
head -40 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "=== grep website-ingestion across repo (non-test) ==="
grep -rln "website-ingestion" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | head -20
