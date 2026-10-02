#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== generator.ts explorePage (lines 240-300) ====="
sed -n '240,300p' src/fyd/proceduralize/generator.ts
echo
echo "===== validator.ts query expansion (lines 60-200) ====="
sed -n '60,200p' src/fyd/sitespec/validator.ts
