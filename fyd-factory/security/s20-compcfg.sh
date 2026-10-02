#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## components/jest.config.cjs ##########"
cat src/fyd/components/jest.config.cjs
echo "########## css-stub.js ##########"
cat src/fyd/components/__tests__/css-stub.js 2>/dev/null
echo "########## components testMatch ##########"
grep -n 'testMatch\|roots' src/fyd/components/jest.config.cjs
