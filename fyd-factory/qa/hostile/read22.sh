#!/bin/bash
cd /home/nolan/projects/ping
sed -n '/export interface FYDThemeTokens/,/^}/p' src/fyd/sitespec/types.ts
echo "@@@@@ boundWebsite @@@@@"
sed -n '/function boundWebsite/,/^}/p' src/fyd/components/renderer.tsx | head -20
echo "@@@@@ generateSiteSpec sig @@@@@"
grep -n "export function generateSiteSpec" src/fyd/proceduralize/generator.ts
