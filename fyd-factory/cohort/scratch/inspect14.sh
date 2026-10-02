#!/bin/bash
cd /home/nolan/projects/ping
echo "=== factsBySource construction ==="
grep -rn "factsBySource" src/fyd/proceduralize/proceduralizer.ts | head -5
grep -rn "html-meta\|opengraph" src/fyd/proceduralize/*.ts | grep -v __tests__ | head -8
echo "=== service card patterns ==="
grep -n "pattern\|PATTERN\|class=\|h2\|h3" src/fyd/proceduralize/service-cards.ts | head -20
echo "=== service card invocation in proceduralizer (980-1050) ==="
sed -n '980,1035p' src/fyd/proceduralize/proceduralizer.ts
