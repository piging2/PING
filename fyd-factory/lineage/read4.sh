#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== fixtures dir ====="
ls src/fyd/proceduralize/__fixtures__/
echo "===== happy-place-graph head ====="
head -120 src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
echo "===== coppersmith-graph head ====="
head -120 src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
