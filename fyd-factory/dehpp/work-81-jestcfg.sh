#!/bin/bash
cd /home/nolan/projects/ping
ls node_modules/ts-jest 2>&1 | head -2
ls node_modules/next/dist/build/jest 2>&1 | head -3
grep -rn "preset" package.json | grep -i jest | head -3
ls node_modules/.bin/ | grep -e "ts-jest" -e "tsx" | head -5
node -e "console.log(require('/home/nolan/projects/ping/node_modules/jest/package.json').version)"
