#!/bin/bash
cd /home/nolan/projects/ping || exit 1
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
echo "===== sites/happy-place/page.tsx ====="
cat src/app/sites/happy-place/page.tsx
echo "===== sites/coppersmith-plumbing/page.tsx ====="
cat src/app/sites/coppersmith-plumbing/page.tsx
