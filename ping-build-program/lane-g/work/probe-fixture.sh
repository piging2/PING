#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== jest config ====="
cat src/fyd/ask/jest.config.cjs
echo "===== fixture exports ====="
grep -n "^export" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head -10
echo "===== fixture size ====="
wc -c src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
echo "===== graph shape peek ====="
grep -n "objects\|relationships\|visibility" src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head -12
