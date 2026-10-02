#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== fixture head ====="
sed -n '1,60p' src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts
echo "===== schema refs in fixture ====="
grep -n "schema" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -30
echo "===== how fixtures regenerate ====="
grep -rn "coppersmith-graph" src tools scripts 2>/dev/null --include="*.ts" -l | head
ls src/fyd/proceduralize/__tests__/
