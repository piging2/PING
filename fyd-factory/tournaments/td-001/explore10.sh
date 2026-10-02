#!/bin/bash
set -u
cd /home/nolan/projects/ping
echo "===== coppersmith page ====="
sed -n '1,120p' src/app/sites/coppersmith-plumbing/page.tsx
echo "===== builder/index.ts ====="
sed -n '1,80p' src/fyd/builder/index.ts
