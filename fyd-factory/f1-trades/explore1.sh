#!/bin/bash
set -e
cd /home/nolan/projects/ping
git status --short | head -20
echo "=== BRANCH ==="
git branch --show-current
echo "=== src/fyd/archetypes ==="
ls -la src/fyd/archetypes/ 2>/dev/null || echo "NO archetypes dir"
echo "=== src/fyd/builder ==="
ls -la src/fyd/builder/ 2>/dev/null | head -40
echo "=== src/fyd tree (depth 3) ==="
find src/fyd -maxdepth 2 -type d | sort | head -40
