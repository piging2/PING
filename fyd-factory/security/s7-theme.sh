#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## media/select.ts ##########"
cat src/fyd/media/select.ts
echo "########## theme tokens derivation ##########"
grep -rn 'FYDThemeTokens' src/fyd --include='*.ts' --include='*.tsx' | grep -v __tests__ | grep -v types.ts | head -20
