#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== regression-corpus head ====="
sed -n '1,80p' src/fyd/proceduralize/__tests__/regression-corpus.test.ts
echo "===== explore/planner in builder ====="
grep -rn -i "explore" src/fyd/builder/*.ts | head -20
echo "===== generator.test explore ====="
grep -n -i "explore" src/fyd/proceduralize/__tests__/generator.test.ts | head -20
