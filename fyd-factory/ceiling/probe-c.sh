#!/bin/bash
# F5-CEILING probe C: read planner.ts, builder index, dogfood
set -e
cd /home/nolan/projects/ping
echo "===== src/fyd/builder/planner.ts ====="
cat src/fyd/builder/planner.ts
echo ""
echo "===== builder/dogfood ====="
ls -R src/fyd/builder/dogfood 2>/dev/null | head -30
