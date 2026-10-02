#!/bin/bash
# CSS + @/ alias probes. Records exact commands and results for HARNESS.md.
cd /home/nolan/projects/ping
TSX=node_modules/.bin/tsx
HOOK=/home/nolan/fyd-compile-harness/runner/css-hook.mjs
# ensure the hook exists on the Pig (copy from shard-a if missing)
if [ ! -f "$HOOK" ]; then cp /home/nolan/fyd-compile-harness/shard-a/css-hook.mjs "$HOOK" 2>/dev/null || true; fi

echo "=== PROBE 1: plain tsx import of renderer.tsx (no css hook, no tsconfig flag) ==="
$TSX -e "import('/home/nolan/projects/ping/src/fyd/components/renderer.tsx').then(() => console.log('PROBE1 OK')).catch((e) => console.log('PROBE1 FAIL:', e.message.split('\n')[0]))"

echo "=== PROBE 2: --import css-hook.mjs, plain tsx (no tsconfig flag) ==="
$TSX --import "$HOOK" -e "import('/home/nolan/projects/ping/src/fyd/components/renderer.tsx').then(() => console.log('PROBE2 OK')).catch((e) => console.log('PROBE2 FAIL:', e.message.split('\n')[0]))"

echo "=== PROBE 3: runtime @/ alias import, plain tsx (no tsconfig flag) ==="
$TSX --import "$HOOK" -e "import('@/fyd/sitespec/schemas.ts').then(() => console.log('PROBE3 OK')).catch((e) => console.log('PROBE3 FAIL:', e.message.split('\n')[0]))"

echo "=== PROBE 4: runtime @/ alias import with explicit --tsconfig ==="
$TSX --tsconfig=/home/nolan/projects/ping/tsconfig.json --import "$HOOK" -e "import('@/fyd/sitespec/schemas.ts').then(() => console.log('PROBE4 OK')).catch((e) => console.log('PROBE4 FAIL:', e.message.split('\n')[0]))"
