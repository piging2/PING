#!/bin/bash
# F5-CEILING probe X: tsconfig strictness; aboutPage full text
set -e
cd /home/nolan/projects/ping
grep -n "noUnusedLocals\|noUnusedParameters\|strict" tsconfig.json
echo "--- aboutPage ---"
sed -n '238,254p' src/fyd/proceduralize/generator.ts
