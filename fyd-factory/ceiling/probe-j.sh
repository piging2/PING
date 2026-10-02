#!/bin/bash
# F5-CEILING probe J: generator sections, eligibility rules
set -e
cd /home/nolan/projects/ping
echo "===== generator.ts section builders ====="
grep -n "component:\|\"Hero\"\|'Hero'\|query:" src/fyd/proceduralize/generator.ts | head -60
echo ""
echo "===== eligibility.ts ====="
head -120 src/fyd/builder/eligibility.ts
echo ""
echo "===== tsconfig paths ====="
grep -n -A8 '"paths"' tsconfig.json
