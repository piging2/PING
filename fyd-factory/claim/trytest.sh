#!/bin/bash
cd /home/nolan/projects/ping
ls -a | grep -i "babel\|jest" ; echo "---"
cat babel.config.js 2>/dev/null || cat .babelrc 2>/dev/null || echo "NO-BABEL-CONFIG"
echo "--- try running one existing sitespec test ---"
npx jest src/fyd/sitespec/__tests__/binding-verifier.test.ts 2>&1 | tail -25
