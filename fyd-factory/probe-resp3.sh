#!/bin/bash
cd /home/nolan/projects/ping || exit 1
OUT=/home/hatch/workspace/fyd-factory/responsive
echo "=== test runner ==="
node -e "const p=require('./package.json'); console.log(JSON.stringify({scripts:p.scripts, devDeps:Object.keys(p.devDependencies||{})}, null, 1))"
echo "=== page.tsx coppersmith ==="
cat src/app/sites/coppersmith-plumbing/page.tsx
echo ""
echo "=== page.tsx happy-place ==="
cat src/app/sites/happy-place/page.tsx
