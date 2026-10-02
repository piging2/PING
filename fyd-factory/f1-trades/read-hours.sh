#!/bin/bash
cd /home/nolan/projects/ping
echo "=== hours in object model ==="
grep -rn -i "openingHours\|\"hours\"\|hours:" src/fyd/sitespec/graph.ts src/fyd/object/types.ts src/lib/ping/types.ts 2>/dev/null | head -10
grep -rn -il "openinghours" src/fyd/ 2>/dev/null | head -10
echo "=== registry exports ==="
grep -n "^export" src/fyd/components/registry.ts
echo "=== components __tests__ ==="
ls src/fyd/components/__tests__/ && head -60 src/fyd/components/__tests__/*.ts* 2>/dev/null | head -80
