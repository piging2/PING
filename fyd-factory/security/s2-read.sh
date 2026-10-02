#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "########## data-boundary.ts ##########"
cat src/fyd/boundary/data-boundary.ts
echo "########## __tests__/data-boundary.test.ts ##########"
cat src/fyd/boundary/__tests__/data-boundary.test.ts
echo "########## jest.config.cjs ##########"
cat src/fyd/boundary/jest.config.cjs
echo "########## package.json (scripts) ##########"
grep -A30 '"scripts"' package.json | head -40
