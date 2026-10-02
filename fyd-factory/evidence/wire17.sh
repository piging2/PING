#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== binding-verifier.ts 176-200 (end of verifyBinding) ==="
sed -n '176,200p' src/fyd/sitespec/binding-verifier.ts
echo "=== renderer.tsx 705-718 (boundField) ==="
sed -n '705,718p' src/fyd/components/renderer.tsx
echo "=== renderer.tsx imports 52-66 ==="
sed -n '52,66p' src/fyd/components/renderer.tsx
echo "=== graph.ts resolveBoundField docblock 148-160 ==="
sed -n '148,160p' src/fyd/sitespec/graph.ts
