#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== who calls generateSiteSpec with profile / applyArchetype ==="
grep -rn "applyArchetype\|profile:" src/fyd --include=*.ts --include=*.tsx -l | grep -v __tests__ | head
echo ""
echo "=== archetypes tests ==="
ls src/fyd/archetypes/__tests__/ && grep -n "describe\|it(" src/fyd/archetypes/__tests__/apply.test.ts | head -30
echo ""
echo "=== generator tests ==="
find src -path '*__tests__*' -name '*generat*'; find src -path '*proceduralize*' -name '*.test.*'
