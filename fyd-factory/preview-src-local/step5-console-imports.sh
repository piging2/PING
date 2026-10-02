#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== demo-owner-console.tsx all imports ==="
grep -n "^import\|from \"" "$WT/src/fyd/owner-mode/demo-owner-console.tsx" | head -30
