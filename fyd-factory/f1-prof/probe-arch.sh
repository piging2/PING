#!/bin/bash
cd /home/nolan/projects/ping
git rev-parse --abbrev-ref HEAD 2>/dev/null
echo "=== src/fyd/archetypes/ ==="
ls -la src/fyd/archetypes/ 2>/dev/null
echo "=== __tests__ ==="
find src/fyd/archetypes -type d 2>/dev/null
echo "=== builder strategy files ==="
ls src/fyd/ 2>/dev/null
find src/fyd -maxdepth 2 -iname '*builder*' -o -maxdepth 2 -iname '*strategy*' 2>/dev/null | head -40
