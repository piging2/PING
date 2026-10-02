#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== resolveBoundField signature (graph.ts 145-170) ==="
sed -n '145,170p' src/fyd/sitespec/graph.ts
echo "=== boundTitle/boundDescription ==="
grep -n "function boundTitle\|function boundDescription" -A 8 src/fyd/components/renderer.tsx | head -25
echo "=== bindings.test.ts 115-145 ==="
sed -n '115,145p' src/fyd/sitespec/__tests__/bindings.test.ts
echo "=== components tests: owner_authored or boundField ==="
grep -rn "owner_authored\|boundField\|resolveBoundField" src/fyd/components/__tests__/ 2>/dev/null | head -10
echo "=== contactMethodFor verification ==="
grep -n "verifyBinding\|verifyPresentationBinding\|resolveBoundField" src/fyd/object/object-projection.ts | head -10
