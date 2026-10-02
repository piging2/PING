#!/bin/bash
cd /home/nolan/projects/ping
echo "=== full import block of generator.ts ==="
sed -n '1,60p' src/fyd/proceduralize/generator.ts | grep -n "import\|from"
echo "=== DEFAULT_FYD_THEME source ==="
grep -rn "DEFAULT_FYD_THEME" src/fyd/proceduralize/generator.ts | head -2
grep -rln "export.*DEFAULT_FYD_THEME" src/fyd/ | head -3
echo "=== renderer.tsx importers in fyd ==="
grep -rln "components/renderer" src/fyd --include="*.ts" | grep -v __tests__ | head -10
