#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== ping-object-source.ts ==="
head -100 src/fyd/data/ping-object-source.ts
echo ""
echo "=== runs dir contents ==="
ls -R src/fyd/proceduralize/runs/2026-09-21-coppersmith-plumbing 2>/dev/null | head -30
echo ""
echo "=== builder/index.ts ==="
head -60 src/fyd/builder/index.ts
