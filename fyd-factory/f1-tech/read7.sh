#!/bin/bash
cd /home/nolan/projects/ping
echo "##### FYDMediaTokens"
awk '/export interface FYDMediaTokens/,/^}/' src/fyd/sitespec/types.ts
echo "##### FYDTypeScale"
awk '/export interface FYDTypeScale/,/^}/' src/fyd/sitespec/types.ts
echo "##### FYDLayoutTokens"
awk '/export interface FYDLayoutTokens/,/^}/' src/fyd/sitespec/types.ts
echo "##### FYDLayoutCharacter"
grep -n -B2 -A 8 "FYDLayoutCharacter" src/fyd/sitespec/types.ts | head -30
