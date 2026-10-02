#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== propose.ts lines 1-40 ==="
sed -n '1,40p' "$WT/src/fyd/customize/propose.ts"
