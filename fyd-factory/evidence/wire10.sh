#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== FYDQuery union ====="
sed -n '25,60p' src/fyd/sitespec/types.ts
echo "===== PingObject export ====="
grep -rn "export.*PingObject" src/fyd/sitespec/types.ts src/lib/ping/types.ts 2>/dev/null | head -5
echo "===== renderer resolveQuery related/all cases ====="
sed -n '84,130p' src/fyd/components/renderer.tsx
