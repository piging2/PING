#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== package.json scripts/test runner ====="
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,1))" | head -40
ls node_modules/.bin/ 2>/dev/null | grep -E "^(vitest|jest|ts-node|tsx)$"
echo
echo "===== coppersmith fixture: schemas present ====="
grep -n "schema:" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | sort | uniq -c | sort -rn | head
echo
echo "===== visibility of external_identity objs ====="
grep -n -A2 "external_identity" src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts | head -20
