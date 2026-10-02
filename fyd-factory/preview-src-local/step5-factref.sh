#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== what does facts.ts export? ==="
grep -n "^export" "$WT/src/fyd/owner-mode/facts.ts" | head -20
echo ""
echo "=== what does owner-proposal.ts import from facts? ==="
sed -n '54,59p' "$WT/src/fyd/customize/owner-proposal.ts"
echo ""
echo "=== is FactRef used in owner-proposal.ts? ==="
grep -n "FactRef" "$WT/src/fyd/customize/owner-proposal.ts" | head -10
