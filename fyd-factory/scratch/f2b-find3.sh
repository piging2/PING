#!/bin/bash
cd /home/nolan/projects/ping
echo "=== corpus mentions ==="
grep -rli "corpus" src scripts research --include="*.md" --include="*.ts" 2>/dev/null | head -20
echo "=== schema json files ==="
find . -path ./node_modules -prune -o -name "*.json" -print 2>/dev/null | grep -iE "schema|fyd|corpus" | head -20
echo "=== research/scratch listing ==="
ls research/ 2>/dev/null | head -40
ls scratch/ 2>/dev/null | head -40
