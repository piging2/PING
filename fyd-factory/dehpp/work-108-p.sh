#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== applyPageOrder: navLabel fallback ==="
grep -n "applyPageOrder" -A 25 src/app/sites/_shared/compose-site.ts | sed -n '1,30p'
echo "=== applyLayoutCharacterOverride impl ==="
grep -n "applyLayoutCharacterOverride" -A 20 src/fyd/proceduralize/generator.ts | head -25
echo "=== renderProvenanceSentence ==="
grep -n "renderProvenanceSentence" -A 30 src/fyd/compose/params.ts | head -40
echo "=== siteTitle/siteDescription ==="
grep -n "export function siteTitle\|export function siteDescription" -A 15 src/fyd/compose/params.ts | head -40