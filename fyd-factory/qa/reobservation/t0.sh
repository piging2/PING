#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== tsx stdin test ==="
echo 'import { generateSiteSpec } from "@/fyd/proceduralize/generator"; console.log("import-ok", typeof generateSiteSpec);' | timeout 90 npx tsx --tsconfig tsconfig.json /dev/stdin 2>&1 | tail -3
echo "=== node version / tsx availability ==="
node --version
ls node_modules/.bin/tsx 2>/dev/null || echo "no local tsx bin"
