#!/bin/bash
set -e
cd /home/nolan/projects/ping
echo "BRANCH: $(git branch --show-current)"
echo "=== src/fyd top-level ==="
ls src/fyd/
echo "=== owner-mode ==="
ls -la src/fyd/owner-mode/ 2>&1
echo "=== customize ==="
ls -la src/fyd/customize/ 2>&1
echo "=== package.json test script ==="
python3 -c "import json; d=json.load(open('package.json')); print(d.get('scripts',{}))" 2>/dev/null || echo "no package.json scripts"
echo "=== vitest presence ==="
ls node_modules/.bin/vitest 2>/dev/null && echo "vitest installed" || echo "no vitest bin"
echo "=== fyd shared dirs ==="
ls src/fyd/ | head -60
