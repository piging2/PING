#!/bin/bash
cd /home/nolan/projects/ping
npx jest src/fyd/builder/__tests__/dimensions.test.ts 2>&1 | tail -6
echo "====="
ls node_modules/@babel/ | head -20
