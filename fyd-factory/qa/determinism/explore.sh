#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git status --porcelain | head -5
git rev-parse --abbrev-ref HEAD
echo "--- src/fyd tree ---"
find src/fyd -maxdepth 2 -type d | sort
echo "--- builder dir ---"
ls src/fyd/builder 2>/dev/null || echo "no builder dir"
echo "--- package.json scripts ---"
node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts||{}).join(' '))" 2>/dev/null
