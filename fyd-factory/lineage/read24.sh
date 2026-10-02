#!/bin/bash
cd /home/nolan/projects/ping || exit 1
grep -n "function CardGrid" src/fyd/components/renderer.tsx
sed -n "$(grep -n 'function CardGrid' src/fyd/components/renderer.tsx | cut -d: -f1),+55p" src/fyd/components/renderer.tsx
echo "===== boundTitle ====="
grep -n "function boundTitle" src/fyd/components/renderer.tsx
sed -n "$(grep -n 'function boundTitle' src/fyd/components/renderer.tsx | cut -d: -f1),+20p" src/fyd/components/renderer.tsx
