#!/bin/bash
# s1: repo structure overview (read-only)
cd /home/nolan/projects/ping || exit 1
echo "=== BRANCH ==="; git branch --show-current
echo "=== TOP-LEVEL ==="; ls
echo "=== SRC ==="; ls src/
echo "=== SRC/FYD SIZE ==="; du -sh src/fyd 2>/dev/null
echo "=== FILE COUNTS (excluding src/fyd, node_modules, .next) ==="
for d in $(ls src/ | grep -v '^fyd$'); do
  n=$(find "src/$d" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)
  echo "$d: $n ts/tsx files"
done
echo "=== KEY CONFIG ==="; ls package.json tsconfig.json next.config.* 2>/dev/null
