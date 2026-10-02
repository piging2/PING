#!/bin/bash
# Lane-media: explore existing media implementation
cd /home/nolan/projects/ping || exit 1
echo "=== git status (branch) ==="
git rev-parse --abbrev-ref HEAD 2>/dev/null
echo "=== src/fyd/media ==="
ls -la src/fyd/media/ 2>/dev/null
echo "=== files under src/fyd/media ==="
find src/fyd/media -type f 2>/dev/null
echo "=== scripts/image-pipeline.mjs ==="
ls -la scripts/image-pipeline.mjs 2>/dev/null && head -80 scripts/image-pipeline.mjs
