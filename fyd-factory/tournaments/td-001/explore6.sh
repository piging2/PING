#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== planner.ts all query lines ====="
sed -n '180,260p' src/fyd/builder/planner.ts
echo "===== generator imports of eligibleComponents ====="
grep -n "eligibleComponents\|import" src/fyd/proceduralize/generator.ts | head -20
echo "===== coppersmith fixture schemas ====="
grep -n "schema:" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c
echo "===== git log generator/validator/schemas ====="
git log --oneline -8 -- src/fyd/proceduralize/generator.ts src/fyd/sitespec/validator.ts src/fyd/sitespec/schemas.ts
