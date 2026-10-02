#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
grep -n "DEV_MODE_SKIP_KV" src/lib/brand.ts src/lib/assignment-store.ts src/lib/media.ts | head -10
echo "=== isStaticBuild ==="
grep -n "function isStaticBuild" -A 10 src/lib/media-kv-store.ts | head -14
echo "=== layout metadata block ==="
sed -n '20,60p' src/app/layout.tsx
