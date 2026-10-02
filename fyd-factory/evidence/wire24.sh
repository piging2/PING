#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== VIEWER area ==="
grep -n "const VIEWER" src/app/sites/_shared/site-client.tsx
sed -n '30,36p' src/app/sites/_shared/site-client.tsx
echo "=== footer area ==="
sed -n '162,172p' src/app/sites/_shared/site-client.tsx
echo "=== renderer rights 905-920 ==="
sed -n '905,920p' src/fyd/components/renderer.tsx
echo "=== renderer rights 1668-1678 ==="
sed -n '1668,1678p' src/fyd/components/renderer.tsx
