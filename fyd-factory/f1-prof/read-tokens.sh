#!/bin/bash
cd /home/nolan/projects/ping
echo "##### FYDThemeTokens"
grep -n -B2 -A 40 "interface FYDThemeTokens" src/fyd/sitespec/types.ts | head -80
echo "##### archetype in types around 330-365"
sed -n '325,365p' src/fyd/sitespec/types.ts
