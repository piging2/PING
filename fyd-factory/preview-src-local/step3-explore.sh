#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== package.json ==="
cat package.json
echo "=== vercel.json ==="
cat vercel.json
echo "=== app routes top-level ==="
ls src/app/
echo "=== sites routes ==="
ls src/app/sites/
echo "=== fyd-night? ==="
ls src/app/fyd-night 2>/dev/null || echo "no fyd-night"
