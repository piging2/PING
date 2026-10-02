#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "=== branch ==="
git branch --show-current
echo "=== ask dir listing ==="
ls -la src/fyd/ask/ 2>/dev/null || echo "NO ASK DIR"
echo "=== app dir structure ==="
ls src/app 2>/dev/null | head -30
echo "=== routes mentioning ask ==="
grep -rl -i "askfyd\|ask-fyd\|ask_fyd" src --include='*.tsx' --include='*.ts' 2>/dev/null | head -20
echo "=== business fixtures ==="
ls src/fyd 2>/dev/null
find . -path ./node_modules -prune -o -name '*coppersmith*' -print 2>/dev/null | grep -v node_modules | head -20
echo "=== git status ==="
git status --porcelain | head -20
