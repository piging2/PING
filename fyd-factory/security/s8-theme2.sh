#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## planner.ts theme tokens (395-445) ##########"
sed -n '395,445p' src/fyd/builder/planner.ts
echo "########## FYDThemeTokens type ##########"
grep -n 'FYDThemeTokens' src/fyd/sitespec/types.ts | head -3
awk '/interface FYDThemeTokens|type FYDThemeTokens/,/^}/' src/fyd/sitespec/types.ts | head -40
echo "########## variant URL validation in bundle-media/derivatives ##########"
grep -rn 'http\|url' src/fyd/media/derivatives.ts 2>/dev/null | head -10
grep -n 'url' src/fyd/media/types.ts | head -20
