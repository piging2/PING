#!/bin/bash
cd /home/nolan/projects/ping || { echo "NO REPO"; exit 1; }
echo "########## coppersmith-graph.ts ##########"
cat src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
