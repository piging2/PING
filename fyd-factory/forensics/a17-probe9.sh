#!/bin/bash
# AGENT-17 probe 9: backing stores per API family (READ-ONLY)
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== /api/ping/* bodies (first 30 lines each) ==="
for f in src/app/api/ping/ask/route.ts src/app/api/ping/object/route.ts src/app/api/ping/proposal/route.ts; do
  echo "--- $f"; head -30 "$f"
done
echo "=== practice storage ==="
grep -rn 'KV_REST_API\|kv\.\|redis\|process.env.DEV_MODE_SKIP_KV\|localStorage\|cookies' src/app/api/practice/session/route.ts | head -10
grep -rln 'DEV_MODE_SKIP_KV' src --include='*.ts' --include='*.tsx' | grep -v __tests__ | sort
echo "=== social storage ==="
grep -rn 'KV_REST_API\|FYD_SOCIAL\|fyd/social\|fs\.\|readFile\|writeFile' src/app/api/fyd/social/post/route.ts src/app/api/fyd/social/state/route.ts | head -12
echo "=== follow/like storage ==="
grep -rn 'KV_REST_API\|FYD_\|writeFile\|readFile' src/app/api/fyd/follow/route.ts | head -8
echo "=== overrides route auth ==="
sed -n '100,160p' 'src/app/api/fyd/objects/[objectId]/overrides/route.ts'
