#!/bin/bash
set -uo pipefail
cd /home/nolan/fyd-preview-wt
echo "=== heroMediaFor signature ==="
grep -n "export function heroMediaFor" -A 25 src/fyd/media/select.ts | head -40
echo "=== tsconfig resolveJsonModule ==="
grep -n "resolveJsonModule\|esModuleInterop" tsconfig.json
echo "=== root layout viewport ==="
grep -n "viewport\|metadata" src/app/layout.tsx | head -10
echo "=== media-kv-store DEV_MODE_SKIP_KV ==="
grep -n "DEV_MODE_SKIP_KV" -B2 -A8 src/lib/media-kv-store.ts | head -30
