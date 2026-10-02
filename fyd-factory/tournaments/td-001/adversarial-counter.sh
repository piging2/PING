#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== all emitters of kind:\"all\" or kind: 'all' in src ==="
grep -rn 'kind: "all"\|kind: .all.' src/fyd src/app --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "\.test\." | head -20
echo "=== ObjectFeed section construction outside generator ==="
grep -rn '"ObjectFeed"' src/fyd src/app --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "\.test\." | grep -v proceduralize/generator | head -20
echo "=== customize/apply-layer: does it touch queries? ==="
grep -n "query\|ObjectFeed\|section" src/fyd/customize/apply-layer.ts | head -30
