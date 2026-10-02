#!/bin/bash
cd /home/nolan/projects/ping
sed -n '137,226p' src/fyd/components/renderer.tsx
echo "@@@@@ fixture shape @@@@@"
ls src/fyd/proceduralize/__fixtures__/
sed -n '1,60p' src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts 2>/dev/null | head -70
