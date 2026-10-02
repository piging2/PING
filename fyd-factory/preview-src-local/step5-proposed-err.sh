#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== all 'proposed.error' usages in owner-proposal.ts ==="
grep -n "proposed\.error" "$WT/src/fyd/customize/owner-proposal.ts"
echo ""
echo "=== all '!proposed.ok' patterns ==="
grep -n "!proposed\.ok" "$WT/src/fyd/customize/owner-proposal.ts"
