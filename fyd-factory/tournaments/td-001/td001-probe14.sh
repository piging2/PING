#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== all 'all'-kind query constructions ====="
grep -rn 'kind: "all"' --include="*.ts" --include="*.tsx" src | grep -v __tests__ | head -20
echo
echo "===== generator.ts section() helper ====="
grep -n "function section\|function roleQuery" src/fyd/proceduralize/generator.ts
sed -n '/^function section/,/^}/p' src/fyd/proceduralize/generator.ts | head -30
