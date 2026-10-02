#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== FYDQuery ==="
grep -n "interface FYDQuery" -A 30 src/fyd/sitespec/types.ts | head -40
echo ""
echo "=== FYDPresentation ==="
grep -n "interface FYDPresentation" -A 25 src/fyd/sitespec/types.ts | head -30
echo ""
echo "=== how generator builds service section query ==="
grep -n "service\|Service" src/fyd/proceduralize/generator.ts | head -30
