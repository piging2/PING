#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== which section fns own lines 1254,1290,1363,1381,1641 ==="
for ln in 1254 1290 1363 1381 1641; do
  fn=$(awk -v L=$ln 'NR<=L && /^function .*Section/ {f=$0; n=NR} END {print n": "f}' src/fyd/components/renderer.tsx)
  echo "line $ln <- $fn"
done
echo ""
echo "=== 1280-1300 ==="
sed -n '1280,1300p' src/fyd/components/renderer.tsx
echo "=== 1355-1390 ==="
sed -n '1355,1390p' src/fyd/components/renderer.tsx
echo "=== 1636-1650 ==="
sed -n '1636,1650p' src/fyd/components/renderer.tsx
