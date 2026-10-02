#!/bin/bash
# F5-CEILING probe G: site-vectors, strategies, infer-strategy, fixture exports
set -e
cd /home/nolan/projects/ping
echo "===== builder/site-vectors.ts ====="
head -100 src/fyd/builder/site-vectors.ts
echo ""
echo "===== builder/strategies.ts (head) ====="
head -80 src/fyd/builder/strategies.ts
echo ""
echo "===== fixture exports ====="
grep -n "^export" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head
grep -n "^export" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head
grep -n "^export" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | head
echo ""
echo "=== object/__tests__/fixtures ==="
ls src/fyd/object/__tests__/fixtures/
echo "=== ping-object-source ==="
ls src/fyd/data/ 2>/dev/null
