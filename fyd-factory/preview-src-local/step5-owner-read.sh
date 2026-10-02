#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
echo "=== owner-console page SearchParams ==="
grep -n "SearchParams" "$WT/src/app/preview/owner-console/page.tsx" | head -10
echo ""
echo "=== first 60 lines ==="
head -60 "$WT/src/app/preview/owner-console/page.tsx"
