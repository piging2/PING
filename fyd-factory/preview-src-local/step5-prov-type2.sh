#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== ObjectProvenance type ==="
grep -B2 -A10 "interface ObjectProvenance\|type ObjectProvenance" "$WT/src/lib/ping/types.ts" | head -25
