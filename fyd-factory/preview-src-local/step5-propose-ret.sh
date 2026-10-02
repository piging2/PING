#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== proposeFromSiteIntent return statements ==="
grep -n "return {" "$WT/src/fyd/customize/propose.ts" | head -20
echo ""
echo "=== ProposeOutcome type ==="
grep -B2 -A4 "type ProposeOutcome" "$WT/src/fyd/customize/propose.ts"
