#!/bin/bash
cd /home/nolan/projects/ping || exit 1
ls babel.config.* .babelrc jest.config.* 2>/dev/null
cat babel.config.js 2>/dev/null || cat babel.config.cjs 2>/dev/null || cat .babelrc 2>/dev/null | head -40
echo "===== jest config ====="
node -e "const p=require('./package.json'); console.log(JSON.stringify(p.jest||{},null,1))" | head -40
echo "===== try one existing passing suite elsewhere? ====="
timeout 90 npx jest src/fyd/object/__tests__/view.test.ts 2>&1 | tail -6
