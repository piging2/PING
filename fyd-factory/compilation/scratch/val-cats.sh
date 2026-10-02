#!/bin/bash
cd /home/nolan/projects/ping
sed -n '/export interface FYDSpecProvenance/,/^}/p' src/fyd/sitespec/types.ts
echo ===
grep -n "isRenderable" -A 5 src/fyd/sitespec/validator.ts | head -12
echo ===
grep -n "warn(\|err(\|info(" src/fyd/sitespec/validator.ts | sed 's/.*warn(/warn: /;s/.*err(/err: /;s/.*info(/info: /' | head -30
echo ===
grep -n "visibility" src/lib/ping/types.ts | head -5
