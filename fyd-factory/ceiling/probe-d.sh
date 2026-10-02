#!/bin/bash
# F5-CEILING probe D: find stored SiteSpecs / planned outputs
set -e
cd /home/nolan/projects/ping
echo "=== site app dirs ==="
ls src/app/sites/ 2>/dev/null
echo "=== find sitespec JSONs ==="
find . -maxdepth 6 -iname "*sitespec*" 2>/dev/null | grep -v node_modules | grep -v "\.next" | head -20
echo "=== find planned/site json ==="
find . -maxdepth 5 -name "*.json" -path "*fyd*" 2>/dev/null | grep -viE "node_modules|package|tsconfig|\.next" | head -40
echo "=== proceduralize generator ==="
ls src/fyd/proceduralize/ 2>/dev/null
echo "=== preview manifests ==="
cat src/fyd/preview/manifests/happy-place.json 2>/dev/null | head -30
