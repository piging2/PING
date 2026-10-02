#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== graph fixture object schemas ==="
grep -n '"schema"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "=== relationships ==="
grep -n '"predicate"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo ""
echo "=== titles ==="
grep -n '"title": "' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -20
echo ""
echo "=== fixture tail ==="
tail -40 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
