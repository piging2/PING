#!/bin/bash
# SWARM-01 probe 4: find the execution substrate outside the next.js repo (read-only)
echo "=== PIG HOME DIRS ==="
ls /home/nolan/ 2>/dev/null
echo "=== PIG PROJECTS ==="
ls /home/nolan/projects/ 2>/dev/null
echo "=== DOCKER CONTAINERS ==="
docker ps --format "{{.Names}} {{.Image}} {{.Ports}}" 2>/dev/null | head -20
echo "=== SEARCH orca dirs ==="
find /home/nolan -maxdepth 3 -iname "*orca*" -not -path "*/node_modules/*" 2>/dev/null | head -20
echo "=== SEARCH gateway dirs ==="
find /home/nolan -maxdepth 3 -iname "*gateway*" -not -path "*/node_modules/*" 2>/dev/null | head -20
echo "=== SEARCH mcp dirs ==="
find /home/nolan -maxdepth 3 -iname "*mcp*" -not -path "*/node_modules/*" 2>/dev/null | head -20
echo "=== QDRANT data ==="
find /home/nolan -maxdepth 4 -iname "*qdrant*" -not -path "*/node_modules/*" 2>/dev/null | head -10
