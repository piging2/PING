#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "=== renderToStaticMarkup usage ==="
grep -rln 'renderToStaticMarkup\|renderToString' src/fyd src/app 2>/dev/null | head -10
echo "=== renderer.tsx exported symbols ==="
grep -n '^export' src/fyd/components/renderer.tsx | head -40
echo "=== react-dom in deps ==="
grep -n '"react-dom"' package.json
node -e "console.log(require('/home/nolan/projects/ping/node_modules/react-dom/package.json').version)" 2>/dev/null || echo "react-dom not installed at top level"
echo "=== jest availability ==="
ls node_modules/.bin/jest 2>/dev/null || echo "no jest binary"
echo "=== happy-place fixture shape (head) ==="
head -80 src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
