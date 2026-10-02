#!/bin/bash
cd /home/nolan/projects/ping
echo "=== HEAD ==="
git rev-parse HEAD
echo "=== diffs in pipeline dirs (must be empty) ==="
git status --porcelain src/fyd/proceduralize src/fyd/sitespec src/fyd/builder 2>/dev/null | head -10
echo "(end of diff list)"
echo "=== tsx anywhere? ==="
ls node_modules/.bin/ | grep -x "tsx" || echo "no tsx in repo bin"
which tsx || echo "no global tsx"
echo "=== tsconfig paths ==="
grep -A5 '"paths"' tsconfig.json 2>/dev/null | head -10
