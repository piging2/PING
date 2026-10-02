#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== PingObject provenance type ==="
grep -n "provenance" "$WT/src/lib/ping/types.ts" | head -10
echo ""
echo "=== provenance kind type ==="
grep -B2 -A5 "kind.*provenance\|provenance.*kind" "$WT/src/lib/ping/types.ts" | head -30
