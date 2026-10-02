#!/bin/bash
cd /home/nolan/projects/ping
echo "=== src/fyd/data layout ==="
ls src/fyd/data/ 2>&1
echo ""
echo "=== ping-object-source.ts ==="
cat src/fyd/data/ping-object-source.ts 2>&1 | head -120
echo ""
echo "=== search: evidence / observation stores ==="
grep -ril "observation" src/fyd/data/ 2>&1 | head
echo "---dirs with evidence---"
find src -type d -name "*evidence*" 2>/dev/null | head
find . -path ./node_modules -prune -o -type d -name "*observation*" -print 2>/dev/null | head
