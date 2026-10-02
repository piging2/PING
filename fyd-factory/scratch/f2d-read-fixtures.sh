#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "########## fixtures-structured.ts ##########"
cat src/fyd/proceduralize/__fixtures__/fixtures-structured.ts
echo ""
echo "########## coppersmith-graph.ts ##########"
cat src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
