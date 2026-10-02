#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== basisFor function (lines 219-235) ==="
sed -n '219,235p' "$WT/src/fyd/ask/concierge.ts"
echo ""
echo "=== all provenance kind string literals in concierge.ts ==="
grep -o '"[a-z-]*"' "$WT/src/fyd/ask/concierge.ts" | sort -u | head -20
