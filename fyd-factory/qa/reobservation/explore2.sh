#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== raw fixture ==="
ls -la src/fyd/proceduralize/raw/coppersmith-plumbing/ 2>/dev/null
echo "=== preview manifests ==="
ls src/fyd/preview/manifests/ 2>/dev/null
echo "=== sites/coppersmith ==="
ls src/app/sites/coppersmith-plumbing/ 2>/dev/null
echo "=== source-refresh.ts head ==="
head -60 src/fyd/builder/source-refresh.ts
