#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== imports ==="
sed -n '1,40p' src/fyd/proceduralize/generator.ts
echo ""
echo "=== generateSiteSpec main ==="
grep -n "export function generateSiteSpec" src/fyd/proceduralize/generator.ts
