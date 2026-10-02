#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== branch ==="
git branch --show-current
git status --short | head -5
echo "=== src/fyd ==="
ls src/fyd/ 2>/dev/null
echo "=== builder ==="
ls src/fyd/builder/ 2>/dev/null
echo "=== preview ==="
ls src/fyd/preview/ 2>/dev/null || ls src/preview/ 2>/dev/null
echo "=== refresh ==="
ls src/fyd/refresh/ 2>/dev/null || find src -maxdepth 2 -name "refresh*" 2>/dev/null | head
echo "=== pipeline.ts ==="
find . -maxdepth 4 -name "pipeline.ts" -not -path "*/node_modules/*" 2>/dev/null | head
echo "=== coppersmith fixtures ==="
find . -iname "*coppersmith*" -not -path "*/node_modules/*" 2>/dev/null | head -30
