#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo === corpus dirs ===
find . -path ./node_modules -prune -o -type d \( -iname '*corpus*' -o -iname '*manifest*' -o -iname '*factory*' \) -print 2>/dev/null | grep -vi node_modules | head -20
echo === happy-place / coppersmith mentions in fixtures ===
grep -rli "happy-place\|coppersmith" --include="*.json" --include="*.ts" src/fyd/builder/__tests__/fixtures.ts src/fyd/proceduralize/__fixtures__/ 2>/dev/null | head
echo === batch-a ===
find /home/nolan -maxdepth 4 -iname '*batch-a*' 2>/dev/null | head
find . -path ./node_modules -prune -o -iname '*batch-a*' -print 2>/dev/null | head
