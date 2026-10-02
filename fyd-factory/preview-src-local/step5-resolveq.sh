#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== where is resolveQuery defined? ==="
grep -rn "export function resolveQuery\|export const resolveQuery" "$WT/src/fyd/" | head -5
echo "=== renderer.tsx: is resolveQuery defined there or re-exported? ==="
grep -n "resolveQuery" "$WT/src/fyd/components/renderer.tsx" | head -5
