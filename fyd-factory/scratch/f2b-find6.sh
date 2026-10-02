#!/bin/bash
cd /home/nolan/projects/ping
echo "=== builder fixtures head ==="
head -c 5000 src/fyd/builder/__tests__/fixtures.ts
echo ""
echo "=== builder dir ==="
ls src/fyd/builder/ 2>/dev/null
