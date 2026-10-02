#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== boundField calls with explicit classification ==="
grep -n "boundField(ctx" src/fyd/components/renderer.tsx | grep -v "function boundField" | head -30
echo "=== any derived/owner_authored/generated classification in renderer boundField calls ==="
grep -n '"derived"\|"owner_authored"\|"generated"' src/fyd/components/renderer.tsx | head -20
echo "=== contactMethodFor body (verification path) ==="
sed -n '107,175p' src/fyd/object/object-projection.ts
