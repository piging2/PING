#!/bin/bash
cd /home/nolan/projects/ping
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/fyd/(owner-mode|customize)/" | head -40
echo "---tsc-exit-scan-done---"
