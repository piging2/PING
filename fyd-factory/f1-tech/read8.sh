#!/bin/bash
cd /home/nolan/projects/ping
echo "##### DEFAULT_FYD_THEME"
sed -n '295,324p' src/fyd/sitespec/types.ts
echo "##### consumers of ctaEmphasis / density / objectProminence / typographyScale / mediaTreatment"
grep -rln "ctaEmphasis\|objectProminence" src/fyd/ --include="*.ts" --include="*.tsx" | grep -v __tests__ | grep -v "archetypes/profiles"
echo "##### renderer.tsx head"
sed -n '1,80p' src/fyd/components/renderer.tsx
