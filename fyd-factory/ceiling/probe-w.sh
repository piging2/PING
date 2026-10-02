#!/bin/bash
# F5-CEILING probe W: exact text for the patch hunks
set -e
cd /home/nolan/projects/ping
echo "--- lines 100-116 ---"
sed -n '100,116p' src/fyd/proceduralize/generator.ts
echo "--- lines 176-186 ---"
sed -n '176,186p' src/fyd/proceduralize/generator.ts
echo "--- lines 244-254 ---"
sed -n '244,254p' src/fyd/proceduralize/generator.ts
