#!/bin/bash
cd /home/nolan/projects/ping
echo "##### sitespec/types.ts (token + archetype types)"
grep -n "FYDThemeTokens\b" src/fyd/sitespec/types.ts | head -5
awk '/export interface FYDThemeTokens/,/^}/' src/fyd/sitespec/types.ts
echo "##### FYDSiteArchetype"
grep -n -A 10 "FYDSiteArchetype" src/fyd/sitespec/types.ts | head -40
echo "##### ObjectPresenceMode"
grep -n -B2 -A 8 "ObjectPresenceMode" src/fyd/sitespec/types.ts | head -40
