#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== fixture object listing ====="
grep -n '"id"\|"schema"\|"visibility"' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -60
