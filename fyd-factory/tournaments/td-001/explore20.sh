#!/bin/bash
set -u
cd /home/nolan/projects/ping
sed -n '20,60p' src/fyd/sitespec/jest.config.cjs
echo "===== GeneratorOptions ====="
grep -n -A8 "interface GeneratorOptions" src/fyd/proceduralize/generator.ts | head -12
echo "===== FYDQuery all shape ====="
grep -n -B2 -A3 'kind: "all"' src/fyd/sitespec/types.ts | head -12
