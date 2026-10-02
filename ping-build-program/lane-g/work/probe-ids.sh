#!/bin/bash
set -u
cd /home/nolan/projects/ping
sed -n '1,20p' src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
echo "===== ids/schemas ====="
grep -n '"id"\|"schema"\|"title"' src/fyd/proceduralize/__fixtures__/happy-place-graph.ts | head -40
