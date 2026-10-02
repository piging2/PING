#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== owner hero id in view.ts / renderer.tsx? ====="
grep -n "ownerHero\|owner-hero\|heroMediaFor\|resolveHeroMedia" src/fyd/object/view.ts src/fyd/components/renderer.tsx 2>/dev/null | head -20
echo "===== Hero section in renderer.tsx ====="
grep -n "Hero\|hero" src/fyd/components/renderer.tsx | head -20
echo "===== sharp png pattern in derivatives.test.ts ====="
sed -n '1,60p' src/fyd/media/__tests__/derivatives.test.ts
