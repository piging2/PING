#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
node_modules/.bin/jest --config src/fyd/compose/jest.config.cjs src/app/sites/_shared/__tests__/chrome-split.test.tsx 2>&1 | grep -A8 "Details:" | head -14