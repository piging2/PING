#!/bin/bash
cd /home/nolan/projects/ping
echo "### tsx/ts-node availability ###"
ls node_modules/.bin/ 2>/dev/null | grep -E '^(tsx|ts-node|esbuild)$' || echo "none of tsx/ts-node/esbuild"
node --version
echo "### fixture module size ###"
wc -l src/fyd/proceduralize/__fixtures__/happy-place-graph.ts src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
