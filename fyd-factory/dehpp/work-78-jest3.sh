#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
npx jest src/fyd/builder/__tests__/dimensions.test.ts 2>&1 | tail -6
echo "====="
npx jest src/fyd/copy/__tests__/defaults.test.ts 2>&1 | grep -A12 "FAIL\|●" | head -30