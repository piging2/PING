#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== which functions contain lines 250-252, 318, 409? ==="
awk 'NR>=150 && NR<=430 && /^export function|^function|^const .* = .*=>/ {print NR": "$0}' "$WT/src/fyd/customize/owner-proposal.ts"
echo "=== lines 245-260 ==="
sed -n '245,260p' "$WT/src/fyd/customize/owner-proposal.ts"
echo "=== lines 310-325 ==="
sed -n '310,325p' "$WT/src/fyd/customize/owner-proposal.ts"
echo "=== lines 400-415 ==="
sed -n '400,415p' "$WT/src/fyd/customize/owner-proposal.ts"
