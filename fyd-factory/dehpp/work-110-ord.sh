#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n '150,215p' src/fyd/proceduralize/generator.ts
echo "=== layoutCharacter handling ==="
grep -n "layoutCharacter" src/fyd/proceduralize/generator.ts | head -8