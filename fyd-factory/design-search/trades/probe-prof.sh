#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== proceduralize fixtures ==="
ls src/fyd/proceduralize/__fixtures__/
echo "=== object test fixtures ==="
find src/fyd/object/__tests__/fixtures -type f | head -20
echo "=== search dentist/consultant/legal/medical fixtures ==="
find . -path ./node_modules -prune -o -path ./.git -prune -o -type f \( -iname "*dentist*" -o -iname "*consultant*" -o -iname "*legal*" -o -iname "*medical*" -o -iname "*clinic*" -o -iname "*attorney*" -o -iname "*accounting*" \) -print 2>/dev/null | grep -v -e node_modules -e ".next" -e ".git/" | head -20
echo "=== f2 corpus outputs? ==="
find ~/workspace/fyd-factory -iname "*corpus*" 2>/dev/null | head -20
ls ~/workspace/fyd-factory/inventory 2>/dev/null | head
