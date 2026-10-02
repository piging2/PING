#!/bin/bash
# F5-CEILING probe B: planner, sitespec dir, fixtures/graphs
set -e
cd /home/nolan/projects/ping
echo "=== src/fyd/sitespec ==="
ls -R src/fyd/sitespec 2>/dev/null | head -60
echo "=== src/fyd/builder ==="
ls src/fyd/builder
echo "=== planner.ts head ==="
wc -l src/fyd/builder/planner.ts
echo "=== find graphs / fixtures ==="
find . -maxdepth 5 -type d \( -iname "*fixture*" -o -iname "*graph*" -o -iname "*corpus*" \) 2>/dev/null | grep -v node_modules | head -30
echo "=== named businesses ==="
find . -maxdepth 6 \( -iname "*coppersmith*" -o -iname "*happy-place*" -o -iname "*happyplace*" \) 2>/dev/null | grep -v node_modules | head -40
