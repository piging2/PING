#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== concierge.ts lines 195-220 ==="
sed -n '195,220p' "$WT/src/fyd/ask/concierge.ts"
echo ""
echo "=== what is the type of 'kind'? ==="
grep -n "kind:" "$WT/src/fyd/ask/concierge.ts" | head -10
echo ""
echo "=== provenance kind type definition ==="
grep -rn "website-derived" "$WT/src/fyd/ask/" | head -10
