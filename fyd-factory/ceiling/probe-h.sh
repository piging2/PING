#!/bin/bash
# F5-CEILING probe H: tenant context, fyd-tenant-graph, infer-strategy, projections fixtures
set -e
cd /home/nolan/projects/ping
echo "===== tenant/tenant-context.ts (head) ====="
head -60 src/fyd/tenant/tenant-context.ts
echo ""
echo "===== fyd-tenant-graph.ts (head) ====="
head -60 src/fyd/data/fyd-tenant-graph.ts
echo ""
echo "===== infer-strategy.ts ====="
head -100 src/fyd/builder/infer-strategy.ts
echo ""
echo "===== object fixtures projections ====="
ls src/fyd/object/__tests__/fixtures/projections/ | head -20
echo ""
echo "===== graph shapes ====="
grep -c "schema:" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
grep -n "schema: \"" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c | sort -rn | head
echo "--- happy-place-graph ---"
grep -n "schema: \"" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | sort | uniq -c | sort -rn | head
echo "--- happy-place-rich-graph objects count ---"
grep -n "const objects" src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts | head
