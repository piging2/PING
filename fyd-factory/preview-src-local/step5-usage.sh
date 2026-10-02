#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== demo-owner-console imports from owner-proposal (lines 50-66) ==="
sed -n '50,66p' "$WT/src/fyd/owner-mode/demo-owner-console.tsx"
echo "=== usage of those imports in the file ==="
grep -n "compileOwnerCommand\|previewOwnerProposal\|OwnerProposal\|ownerProposal" "$WT/src/fyd/owner-mode/demo-owner-console.tsx" | head -20
