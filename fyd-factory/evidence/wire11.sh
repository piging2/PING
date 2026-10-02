#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== renderer.tsx head ====="
sed -n '1,70p' src/fyd/components/renderer.tsx | grep -n "use client\|^import\|^} from" | head -30
echo "===== does renderer.tsx have use client? ====="
head -5 src/fyd/components/renderer.tsx
echo "===== sitespec/index.ts exports ====="
cat src/fyd/sitespec/index.ts 2>/dev/null | head -30
