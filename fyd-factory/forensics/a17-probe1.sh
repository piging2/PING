#!/bin/bash
# AGENT-17 probe 1: route + component inventory (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== BRANCH/HEAD ==="
git branch --show-current 2>/dev/null
git rev-parse --short HEAD 2>/dev/null
echo "=== APP ROUTE TREE (page/layout/route files) ==="
find src/app -type f \( -name 'page.tsx' -o -name 'page.ts' -o -name 'layout.tsx' -o -name 'route.ts' -o -name 'route.tsx' -o -name 'default.tsx' -o -name 'not-found.tsx' -o -name 'error.tsx' \) | sort
echo "=== DYNAMIC SEGMENTS ==="
find src/app -type d -name '*\[*' | sort
echo "=== TOTAL FILE COUNT src/ ==="
find src -type f | wc -l
echo "=== middleware ==="
ls -la src/middleware.ts 2>/dev/null
echo "=== vercel.json ==="
cat vercel.json 2>/dev/null
echo "=== next.config ==="
ls next.config.* 2>/dev/null && head -60 next.config.mjs 2>/dev/null
echo "=== package.json name/scripts ==="
python3 -c "import json;d=json.load(open('package.json'));print(d.get('name'));print(json.dumps(d.get('scripts',{}),indent=1))"
