#!/bin/bash
# F5-CEILING probe P: render-model query resolution; exact generator lines
set -e
cd /home/nolan/projects/ping
echo "=== render-model query kinds ==="
grep -n "reference\|\"related\"\|'related'\|kind ===" src/fyd/sitespec/render-model.ts | head -20
echo ""
echo "=== generator.ts lines 60-100 ==="
sed -n '60,100p' src/fyd/proceduralize/generator.ts | cat -n
echo ""
echo "=== generator.ts homePage People + aboutPage People line numbers ==="
grep -n "People" src/fyd/proceduralize/generator.ts
