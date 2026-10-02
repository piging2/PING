#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== detailHref definition ==="
grep -n 'detailHref' src/fyd/components/renderer.tsx | head
sed -n '690,760p' src/fyd/components/renderer.tsx
echo "=== media src pipeline ==="
sed -n '600,660p' src/fyd/components/renderer.tsx
echo "=== DisplayMedia select ==="
ls src/fyd/media/ | head -30
grep -rn 'href\|src:' src/fyd/media/select.ts 2>/dev/null | head -20
