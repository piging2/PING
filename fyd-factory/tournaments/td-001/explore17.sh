#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== ping-object-source ====="
sed -n '1,100p' src/fyd/data/ping-object-source.ts
echo "===== where projections live ====="
grep -rn "projection" src/fyd/data/ping-object-source.ts | head -10
find . -path ./node_modules -prune -o -name "*.json" -path "*coppersmith*" -print 2>/dev/null | head
