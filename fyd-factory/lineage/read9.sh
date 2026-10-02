#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "===== raw/coppersmith-plumbing ====="
ls -la src/fyd/proceduralize/raw/coppersmith-plumbing/
echo "===== raw/happy-place-platform ====="
ls -la src/fyd/proceduralize/raw/happy-place-platform/
echo "===== raw/README.md ====="
cat src/fyd/proceduralize/raw/README.md
echo "===== runs/2026-09-21-coppersmith-plumbing ====="
ls -la src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/
echo "===== sitespec/render-model.ts head ====="
head -80 src/fyd/sitespec/render-model.ts
