#!/bin/bash
# Check how FYD_PROJECTION_DIR is resolved and whether there is a deployment-safe fallback.
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "--- references to FYD_PROJECTION_DIR ---"
grep -rn "FYD_PROJECTION_DIR" "$WT/src" "$WT/next.config.ts" 2>/dev/null | head -15
echo "--- projection loader code ---"
grep -rln "fyd-night-projections" "$WT/src" 2>/dev/null | head -10
