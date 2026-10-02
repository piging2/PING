#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== DraftContext interface (lines 185-200) ==="
sed -n '185,200p' "$WT/src/fyd/customize/owner-proposal.ts"
echo ""
echo "=== usage at 519-525 ==="
sed -n '519,525p' "$WT/src/fyd/customize/owner-proposal.ts"
echo ""
echo "=== SiteFact interface (what fields does it have?) ==="
sed -n '49,66p' "$WT/src/fyd/owner-mode/facts.ts"
