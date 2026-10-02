#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git branch --show-current
echo "=== fixtures dir ==="
ls -la src/fyd/proceduralize/__fixtures__/ 2>/dev/null || echo "NO such dir"
echo "=== any fixture dirs in fyd ==="
find src/fyd -type d -iname "*fixture*" 2>/dev/null | head
echo "=== fixture files (any ext) in fyd ==="
find src/fyd -iname "*fixture*" -not -path "*/node_modules/*" 2>/dev/null | head -30
echo "=== corpus dirs in repo ==="
find . -maxdepth 4 -iname "*corpus*" -not -path "*/node_modules/*" 2>/dev/null | head
echo "=== fyd tree top ==="
ls src/fyd/ 2>/dev/null | head -40
