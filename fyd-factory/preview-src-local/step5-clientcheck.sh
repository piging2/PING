#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== demo-owner-console head ==="
head -40 "$WT/src/fyd/owner-mode/demo-owner-console.tsx"
echo "=== what it imports from owner-proposal ==="
grep -n "owner-proposal" -A 8 "$WT/src/fyd/owner-mode/demo-owner-console.tsx" | head -20
echo "=== propose.ts node imports ==="
grep -n "node:" "$WT/src/fyd/customize/propose.ts" | head -5
echo "=== owner-events node imports ==="
grep -n "node:" "$WT/src/fyd/object/owner-events.ts" | head -5
