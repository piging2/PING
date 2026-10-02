#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== explore in generator.ts ====="
grep -n -i "explore" src/fyd/proceduralize/generator.ts | head -20
echo
echo "===== 'all' query expansion ====="
grep -rn '"all"\|'"'"'all'"'"'\|allQuery\|expandQuery' --include="*.ts" src/fyd | grep -vi test | head -20
echo
echo "===== Spec failed validation ====="
grep -rn "Spec failed validation\|failed validation" --include="*.ts" --include="*.tsx" src | head -10
