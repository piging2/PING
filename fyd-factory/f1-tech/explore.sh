#!/bin/bash
set -e
cd /home/nolan/projects/ping
git status -sb | head -5
git rev-parse --abbrev-ref HEAD
echo "=== archetypes dir ==="
ls -la src/fyd/archetypes/ 2>/dev/null
echo "=== builder dir (strategy files) ==="
ls src/fyd/builder/ 2>/dev/null
echo "=== media manifests ==="
ls src/fyd/media/manifests/ 2>/dev/null
echo "=== builder tests ==="
ls src/fyd/builder/__tests__/ 2>/dev/null | head -30
