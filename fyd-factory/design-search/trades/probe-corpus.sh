#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
echo "=== corpus dirs (non-git) ==="
find . -path ./node_modules -prune -o -path ./.git -prune -o -type d -iname "*corpus*" -print 2>/dev/null | head -20
echo "=== corpus files (non-git) ==="
find . -path ./node_modules -prune -o -path ./.git -prune -o -type f -iname "*corpus*" -print 2>/dev/null | grep -v node_modules | head -30
echo "=== rest of types.ts (from line 100) ==="
sed -n '100,400p' src/fyd/sitespec/types.ts
echo "=== components registry dir ==="
ls src/fyd/components/ | head -40
