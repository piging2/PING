#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== CHARACTER_PRESENTATION ==="
grep -n "CHARACTER_PRESENTATION" src/fyd/components/renderer.tsx | head -5
sed -n "$(grep -n 'const CHARACTER_PRESENTATION' src/fyd/components/renderer.tsx | cut -d: -f1),+60p" src/fyd/components/renderer.tsx
echo ""
echo "=== layoutCharacter read ==="
grep -n "layoutCharacter" src/fyd/components/renderer.tsx | head -10
