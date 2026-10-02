#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== FYDSiteSpec type ==="
grep -n "interface FYDSiteSpec" -A 30 src/fyd/sitespec/types.ts | head -45
echo ""
echo "=== FYDSection key fields ==="
grep -n "interface FYDSection" -A 25 src/fyd/sitespec/types.ts | head -30
echo ""
echo "=== structured-data exports ==="
grep -n "^export" src/fyd/proceduralize/structured-data.ts | head -10
echo ""
echo "=== does generator emit structured data / nav? ==="
grep -n "structuredData\|nav\b\|navigation" src/fyd/proceduralize/generator.ts | head -15
