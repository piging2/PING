#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== projections on disk ====="
ls -la /home/nolan/ping/var/fyd-projections/ 2>&1 | head -10
echo "===== generator.ts head ====="
head -130 src/fyd/proceduralize/generator.ts
echo "===== app/sites/happy-place/page.tsx head ====="
head -60 src/app/sites/happy-place/page.tsx
