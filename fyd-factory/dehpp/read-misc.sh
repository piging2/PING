#!/bin/bash
cd /home/nolan/projects/ping
echo "##### urgency policy search"
grep -rn "urgency" src/fyd/ --include='*.ts' --include='*.tsx' | grep -v __tests__ | head -15
echo "##### validator head"
sed -n '1,60p' src/fyd/sitespec/validator.ts
echo "##### isRenderable"
grep -n -A 15 "export function isRenderable" src/fyd/sitespec/validator.ts | head -25
