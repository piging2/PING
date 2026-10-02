#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "--- callers of ping-object-source ---"
grep -rln "ping-object-source" "$WT/src" 2>/dev/null | head -10
echo "--- what reads fyd-night-projections dir ---"
grep -rln "fyd-night-projections" "$WT/src" 2>/dev/null | head -10
echo "--- cohort page data loading ---"
sed -n '1,60p' "$WT/src/app/fyd-night/cohort/[siteId]/page.tsx"
