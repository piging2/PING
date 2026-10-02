#!/bin/bash
cd /home/nolan/projects/ping
node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json --version 2>&1 | head -3
echo "---eval test---"
node_modules/.bin/tsx --tsconfig /home/nolan/projects/ping/tsconfig.json -e "console.log('tsconfig-flag-ok')" 2>&1 | head -3
