#!/bin/bash
cd /home/nolan/projects/ping
echo "##### dimensions.ts lines 170-235"
sed -n '170,235p' src/fyd/builder/dimensions.ts
echo "##### generator profile wiring"
grep -rn "profile" src/fyd/proceduralize/generator.ts | head -20
