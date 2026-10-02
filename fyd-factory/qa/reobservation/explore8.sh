#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== dogfood script ==="
head -80 src/fyd/builder/dogfood/build-ping-fyd-projection.mjs
echo ""
echo "=== RUN-NOTES coppersmith ==="
head -60 src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing/RUN-NOTES.md
