#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== refresh README ==="
cat src/fyd/refresh/README.md | head -80
echo ""
echo "=== proceduralizer head ==="
head -70 src/fyd/proceduralize/proceduralizer.ts
echo ""
echo "=== ping-object-source ==="
ls src/fyd/data/ 2>/dev/null | head -20
